"""Constraint solver (OR-Tools CP-SAT) and course-of-action generation."""
import copy
import math
import time

from ortools.sat.python import cp_model

from .data import BASES, KM, SERV_MIN


def dist(a, b):
    return math.hypot(a["x"] - b["x"], a["y"] - b["y"])


def weight(m):
    return (m["prio"] ** 1.5) * 100


def pair_check(ac, m):
    if ac["grounded"]:
        return False, "grounded by Base Ops"
    if ac["serv"] < SERV_MIN:
        return False, f"serviceability {round(ac['serv'])}% is under the {SERV_MIN}% floor"
    if m["type"] not in ac["roles"]:
        return False, f"not {m['type']}-capable"
    if ac["duty"] < m["hours"]:
        return False, f"crew duty left {ac['duty']}h is under the {m['hours']}h task"
    d = dist(BASES[ac["base"]], m)
    if d > ac["range"]:
        return False, f"{round(d * KM)} km is beyond its {round(ac['range'] * KM)} km range"
    return True, ""


def pair_score(ac, m):
    d = dist(BASES[ac["base"]], m)
    return 50 + 40 * (1 - d / ac["range"]) - ac["fault"] * 0.4 + (ac["serv"] - 80) * 0.2


def explain_pair(plan_stock, m, ac):
    d = round(dist(BASES[ac["base"]], m) * KM)
    left = plan_stock[ac["base"]][m["weapon"]]
    return [
        f"Serviceability {round(ac['serv'])}% (floor {SERV_MIN}%)",
        f"Crew duty left {ac['duty']}h, task needs {m['hours']}h",
        f"{BASES[ac['base']]['name']} to target {d} km, range {round(ac['range'] * KM)} km",
        f"{m['weapon']} x{m['per']} from {BASES[ac['base']]['name']}, {left} left in stock",
        f"Predicted 48h fault risk {ac['fault']}%",
    ]


def unmet_reason(m, aircraft, weather):
    if weather > m["wl"]:
        return f"Held: weather severity {weather} is above this task's limit of {m['wl']}."
    eligible = sum(1 for a in aircraft if pair_check(a, m)[0])
    if eligible < m["need"]:
        return (f"Needs {m['need']} {m['type']}-capable aircraft in range with enough crew duty, "
                f"but only {eligible} qualify.")
    return "Eligible aircraft or munitions are already committed to higher-value tasks."


def solve(aircraft, missions, weather, frozen=None, time_limit=5.0):
    t0 = time.perf_counter()
    frozen = frozen or {}
    by_id = {a["id"]: a for a in aircraft}
    stock = {k: dict(b["stock"]) for k, b in BASES.items()}
    used, assign, scores, held, free = set(), {}, {}, [], []

    for m in missions:
        if weather > m["wl"]:
            held.append(m["id"])
            continue
        f = frozen.get(m["id"])
        if f:
            tmp, ok = copy.deepcopy(stock), True
            for i in f:
                a = by_id.get(i)
                if a is None or i in used or not pair_check(a, m)[0] or tmp[a["base"]][m["weapon"]] < m["per"]:
                    ok = False
                    break
                tmp[a["base"]][m["weapon"]] -= m["per"]
            if ok:
                used.update(f)
                stock = tmp
                assign[m["id"]] = list(f)
                scores[m["id"]] = {i: pair_score(by_id[i], m) for i in f}
                continue
        free.append(m)

    avail = [a for a in aircraft if a["id"] not in used]
    status = "OPTIMAL"
    if free:
        model = cp_model.CpModel()
        x, y = {}, {}
        for m in free:
            y[m["id"]] = model.NewBoolVar(f"y_{m['id']}")
            elig = []
            for a in avail:
                if pair_check(a, m)[0]:
                    x[a["id"], m["id"]] = model.NewBoolVar(f"x_{a['id']}_{m['id']}")
                    elig.append(x[a["id"], m["id"]])
            # a mission is funded only with its full complement
            model.Add(sum(elig) == m["need"] * y[m["id"]])
        for a in avail:
            mine = [v for (ai, _), v in x.items() if ai == a["id"]]
            if mine:
                model.Add(sum(mine) <= 1)
        mmap = {m["id"]: m for m in free}
        for base in BASES:
            for w in ("AAM", "PGM", "ARM", "ISR"):
                terms = [v * mmap[mi]["per"] for (ai, mi), v in x.items()
                         if by_id[ai]["base"] == base and mmap[mi]["weapon"] == w]
                if terms:
                    model.Add(sum(terms) <= stock[base][w])
        model.Maximize(
            sum(round(weight(m) * 10) * y[m["id"]] for m in free)
            + sum(round(pair_score(by_id[ai], mmap[mi])) * v for (ai, mi), v in x.items())
        )
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit
        solver.parameters.num_workers = 1
        solver.parameters.random_seed = 1
        st = solver.Solve(model)
        status = solver.StatusName(st)
        if st in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for (ai, mi), v in x.items():
                if solver.Value(v):
                    a, m = by_id[ai], mmap[mi]
                    assign.setdefault(mi, []).append(ai)
                    scores.setdefault(mi, {})[ai] = pair_score(a, m)
                    stock[a["base"]][m["weapon"]] -= m["per"]

    funded = [m["id"] for m in missions if m["id"] in assign]
    unmet = [m["id"] for m in missions if m["id"] not in assign and m["id"] not in held]
    total = sum(weight(m) for m in missions) or 1
    got = sum(weight(m) for m in missions if m["id"] in assign)
    mm = {m["id"]: m for m in missions}
    return {
        "assign": assign, "funded": funded, "held": held, "unmet": unmet,
        "stockLeft": stock, "pct": round(got / total * 100),
        "used": sum(len(v) for v in assign.values()),
        "ms": max(1, round((time.perf_counter() - t0) * 1000)),
        "status": status,
        "explain": {mi: {ai: explain_pair(stock, mm[mi], by_id[ai]) for ai in ids} for mi, ids in assign.items()},
        "reasons": {m["id"]: unmet_reason(m, aircraft, weather) for m in missions if m["id"] in unmet or m["id"] in held},
    }


def retasked(old, new):
    o = {a: m for m, ids in old.items() for a in ids}
    n = {a: m for m, ids in new.items() for a in ids}
    return sum(1 for a in o if n.get(a) != o[a])


def diff_lines(old, new, missions):
    mm = {m["id"]: m for m in missions}
    lines = []
    for i in new["funded"]:
        if i not in old["assign"]:
            lines.append(f"Covers {i} (P{mm[i]['prio']}) with {', '.join(new['assign'][i])}")
    for i in old["funded"]:
        if i not in new["assign"]:
            lines.append(f"Drops {i} (P{mm[i]['prio']}), no feasible aircraft left")
    o = {a: m for m, ids in old["assign"].items() for a in ids}
    n = {a: m for m, ids in new["assign"].items() for a in ids}
    for a in o:
        if a in n and n[a] != o[a]:
            lines.append(f"{a} retasked {o[a]} → {n[a]}")
    return lines or ["No change to the current tasking"]


def make_coas(base, aircraft, missions, weather):
    mm = {m["id"]: m for m in missions}
    old = [mm[i] for i in base["assign"] if i in mm]
    lowest = min(old, key=lambda m: m["prio"]) if old else None

    def pick(fn):
        return {i: ids for i, ids in base["assign"].items() if fn(mm.get(i))}

    defs = [
        ("full", "Re-optimise everything", "Solve from scratch. Best coverage, but the most aircraft change tasks.", {}),
        ("min", "Minimum disruption", "Keep every funded package. Only spare aircraft are used.", pick(lambda m: True)),
        ("strike", "Protect the strike package", "Lock P4+ strike and SEAD tasks. Everything else can move.",
         pick(lambda m: m and m["prio"] >= 4 and m["type"] in ("STRIKE", "SEAD"))),
        ("defer", "Defer the lowest-priority task",
         f"Release {lowest['id']} (P{lowest['prio']}) and keep the rest." if lowest else "Release the weakest task.",
         pick(lambda m: m is not lowest)),
    ]
    seen, out = set(), []
    for key, title, blurb, frozen in defs:
        plan = solve(aircraft, missions, weather, frozen)
        sig = tuple(sorted((k, tuple(sorted(v))) for k, v in plan["assign"].items()))
        if sig in seen:
            continue
        seen.add(sig)
        moved = retasked(base["assign"], plan["assign"])
        # a course of action that leaves a top-priority (P5) task uncovered never outranks one that covers it
        uncovered = sum(1 for m in missions if m["prio"] >= 5 and m["id"] not in plan["assign"])
        lines = diff_lines(base, plan, missions)
        for m in missions:
            if m["prio"] >= 5 and m["id"] not in plan["assign"]:
                lines = [f"Leaves {m['id']} (P5) uncovered: no spare aircraft qualify"] + [l for l in lines if not l.startswith("No change")]
        out.append({"key": key, "title": title, "blurb": blurb, "plan": plan, "moved": moved,
                    "score": plan["pct"] - 7 * moved - 1000 * uncovered, "lines": lines})
    return sorted(out, key=lambda c: -c["score"])
