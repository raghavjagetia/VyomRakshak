"""Shared operating picture. One Desk instance is the single source of truth, so every
browser (planner, commander, base ops) sees the same plan, feeds and audit trail."""
import os
import random
import sqlite3
import threading
import time

from fastapi import HTTPException

from .data import BASES, SERV_MIN, fresh_aircraft, fresh_missions, popup_mission
from .readiness import Readiness
from .solver import make_coas, solve

SOURCES = [("Maintenance", 4), ("Crew", 8), ("Weapons", 6), ("Airspace", 12), ("Met", 5), ("Intel", 3)]
ALLOWED = {
    "priority": {"planner"}, "publish": {"planner"},
    "coa": {"cdr"}, "ground": {"base"},
}
ROLE_NAME = {"planner": "Planner", "cdr": "Commander", "base": "Base ops"}
DB_PATH = os.environ.get("AUDIT_DB", os.path.join(os.path.dirname(__file__), "..", "data", "audit.db"))


class Desk:
    def __init__(self):
        self.lock = threading.RLock()
        self.ready = Readiness()
        os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
        self.db = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, ts TEXT, who TEXT, text TEXT)")
        self.db.commit()
        self.sim_events = False
        self.reset(announce=False)

    # ---------- helpers ----------
    def log(self, who, text):
        ts = time.strftime("%H:%M:%S")
        self.db.execute("INSERT INTO audit(ts, who, text) VALUES (?,?,?)", (ts, who, text))
        self.db.commit()

    def _faults(self):
        for a, f in zip(self.aircraft, self.ready.predict(self.aircraft)):
            a["fault"] = f

    def _eligible_sig(self):
        return tuple(a["id"] for a in self.aircraft if not a["grounded"] and a["serv"] >= SERV_MIN)

    def _replan(self):
        self.plan = solve(self.aircraft, self.missions, self.weather)
        if self.published is None:
            self.published = self.plan
        if self.popup:
            self.coas = make_coas(self.plan, self.aircraft, self.missions + [self.popup], self.weather)
        self.version += 1

    def _check(self, action, role):
        if role not in ALLOWED[action]:
            need = " or ".join(ROLE_NAME[r] for r in ALLOWED[action])
            raise HTTPException(403, f"Your role ({ROLE_NAME.get(role, role)}) cannot do this. {need} role required.")

    # ---------- lifecycle ----------
    def reset(self, announce=True):
        with self.lock:
            self.aircraft, self.missions = fresh_aircraft(), fresh_missions()
            self.weather, self.popup, self.coas, self.published = 30, None, [], None
            self.version = getattr(self, "version", 0)
            self.feeds = {n: {"period": p, "last": time.time(), "down": False} for n, p in SOURCES}
            self._faults()
            self._replan()
            if announce:
                self.log("System", "Desk reset to the baseline scenario.")

    # ---------- actions ----------
    def set_weather(self, value, role):
        with self.lock:
            self.weather = max(0, min(100, int(value)))
            self._replan()
            held = ", ".join(self.plan["held"]) or "none"
            self.log("Met", f"Weather severity set to {self.weather}. Held tasks: {held}.")

    def priority(self, mid, delta, role):
        with self.lock:
            self._check("priority", role)
            m = next((m for m in self.missions if m["id"] == mid), None)
            if not m:
                raise HTTPException(404, "No such mission")
            n = max(1, min(5, m["prio"] + int(delta)))
            if n != m["prio"]:
                self.log("Planner", f"{mid} priority P{m['prio']} → P{n}")
                m["prio"] = n
                self._replan()

    def ground(self, aid, role):
        with self.lock:
            self._check("ground", role)
            a = next((a for a in self.aircraft if a["id"] == aid), None)
            if not a:
                raise HTTPException(404, "No such aircraft")
            a["grounded"] = not a["grounded"]
            self.log("Base ops", f"{aid} {'grounded' if a['grounded'] else 'released'}.")
            self._replan()

    def publish(self, role):
        with self.lock:
            self._check("publish", role)
            self.published = self.plan
            self.log("Planner", f"Approved tasking order. {len(self.plan['funded'])} tasks, "
                                f"{self.plan['pct']}% priority coverage.")
            self.version += 1

    def inject_popup(self, role):
        with self.lock:
            if self.popup or any(m.get("popup") for m in self.missions):
                return
            self.popup = popup_mission()
            self._replan()
            self.log("Intel feed", f"Pop-up track X1 detected, priority 5. Re-plan produced {len(self.coas)} ranked options.")

    def approve_coa(self, index, role):
        with self.lock:
            self._check("coa", role)
            if not self.popup or not (0 <= index < len(self.coas)):
                raise HTTPException(409, "No pending course of action")
            c = self.coas[index]
            self.missions.append(self.popup)
            self.popup, self.coas = None, []
            self.plan = self.published = c["plan"]
            self.log("Commander", f'Approved "{c["title"]}". ' + "; ".join(c["lines"]) + ".")
            self.log("System", "Orders pushed to crews and base ops.")
            self.version += 1

    def toggle_feed(self, name, role):
        with self.lock:
            f = self.feeds.get(name)
            if not f:
                raise HTTPException(404, "No such feed")
            f["down"] = not f["down"]
            self.log("System", f"{name} feed {'lost, now running on last good values (confidence reduced)' if f['down'] else 'restored'}.")
            self.version += 1

    def set_sim(self, on):
        with self.lock:
            self.sim_events = bool(on)
            self.log("System", f"Simulated feed events {'on' if on else 'off'}.")
            self.version += 1

    # ---------- simulated feeds ----------
    def tick(self):
        with self.lock:
            now = time.time()
            for f in self.feeds.values():
                if not f["down"] and now - f["last"] >= f["period"]:
                    f["last"] = now
            before = self._eligible_sig()
            if not self.feeds["Maintenance"]["down"]:
                for a in self.aircraft:
                    a["hrs"] += random.uniform(0, .06)
                    a["serv"] = max(40.0, min(100.0, a["serv"] + random.uniform(-.25, .25)))
            if self.sim_events and random.random() < .07:
                self._random_event()
            self._faults()
            if self._eligible_sig() != before:
                self._replan()

    def _random_event(self):
        kind = random.choice(["fault", "fault", "recover", "front"])
        if kind == "fault":
            ok = [a for a in self.aircraft if a["serv"] >= SERV_MIN and not a["grounded"]]
            if ok:
                a = random.choice(ok)
                old = round(a["serv"])
                a["serv"] = float(random.randint(52, 66))
                a["faults"] += 1
                self.log("Maintenance feed", f"{a['id']} fault flagged. Serviceability {old}% → {round(a['serv'])}%.")
        elif kind == "recover":
            low = [a for a in self.aircraft if a["serv"] < SERV_MIN]
            if low:
                a = random.choice(low)
                a["serv"], a["hrs"], a["faults"] = 88.0, 2.0, max(0, a["faults"] - 1)
                self.log("Maintenance feed", f"{a['id']} returned to service after inspection.")
        else:
            self.weather = max(0, min(100, self.weather + random.choice([-18, 18])))
            self._replan()
            self.log("Met feed", f"Weather front. Severity now {self.weather}.")

    # ---------- view ----------
    def snapshot(self):
        with self.lock:
            now = time.time()
            feeds = []
            for n, f in self.feeds.items():
                age = round(now - f["last"], 1)
                feeds.append({"name": n, "age": age, "down": f["down"],
                              "status": "lost" if f["down"] else ("stale" if age > 2 * f["period"] else "fresh")})
            rows = self.db.execute("SELECT ts, who, text FROM audit ORDER BY id DESC LIMIT 30").fetchall()
            pub = self.published
            return {
                "version": self.version, "weather": self.weather, "sim": self.sim_events,
                "aircraft": self.aircraft,
                "missions": self.missions,
                "popup": self.popup,
                "plan": self.plan,
                "publishedPct": pub["pct"] if pub else self.plan["pct"],
                "dirty": pub is not None and pub["assign"] != self.plan["assign"],
                "coas": [{"key": c["key"], "title": c["title"], "blurb": c["blurb"], "pct": c["plan"]["pct"],
                          "moved": c["moved"], "ms": c["plan"]["ms"], "lines": c["lines"],
                          "x1": "X1" in c["plan"]["assign"]} for c in self.coas],
                "feeds": feeds,
                "degraded": [f["name"] for f in feeds if f["status"] != "fresh"],
                "log": [{"t": t, "who": w, "text": x} for t, w, x in rows],
                "bases": BASES,
            }
