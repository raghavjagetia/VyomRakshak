"""Synthetic theatre: 5 bases, 24 aircraft, 12 missions. All fictional."""
KM = 1200          # 1 map unit = 1200 km
SERV_MIN = 70      # % serviceability floor

BASES = {
    "A": {"name": "ALPHA",   "x": .14, "y": .30, "stock": {"AAM": 6,  "PGM": 6, "ARM": 3, "ISR": 2}},
    "B": {"name": "BRAVO",   "x": .40, "y": .78, "stock": {"AAM": 6,  "PGM": 8, "ARM": 2, "ISR": 3}},
    "C": {"name": "CHARLIE", "x": .74, "y": .46, "stock": {"AAM": 6,  "PGM": 6, "ARM": 3, "ISR": 2}},
    "D": {"name": "DELTA",   "x": .50, "y": .20, "stock": {"AAM": 4,  "PGM": 6, "ARM": 2, "ISR": 1}},
    "E": {"name": "ECHO",    "x": .86, "y": .80, "stock": {"AAM": 4,  "PGM": 4, "ARM": 1, "ISR": 2}},
}

SU, RF, JG, MG, TJ, MR = "Su-30MKI", "Rafale", "Jaguar", "MiG-29", "Tejas", "Mirage 2000"
FULL, MULTI = ["CAP", "STRIKE", "SEAD"], ["CAP", "STRIKE"]

# id, type, base, roles, range, serviceability %, crew duty hours left, hrs since service, faults (90 d)
_AC = [
    ("S1", SU, "A", FULL, .62, 94, 9,   8, 0), ("S2", SU, "A", FULL, .62, 88, 8,  30, 0),
    ("S3", SU, "C", FULL, .62, 91, 7.5, 20, 0), ("S4", SU, "C", FULL, .62, 86, 9,  38, 1),
    ("S5", SU, "D", FULL, .62, 93, 8,  12, 0), ("S6", SU, "D", FULL, .62, 79, 6,  52, 1),
    ("R1", RF, "B", MULTI, .60, 96, 9,   6, 0), ("R2", RF, "B", MULTI + ["RECCE"], .60, 83, 6, 60, 2),
    ("R3", RF, "D", MULTI, .60, 92, 8,  15, 0), ("R4", RF, "E", MULTI, .60, 89, 7.5, 24, 0),
    ("J1", JG, "B", ["STRIKE", "RECCE"], .45, 72, 8, 45, 1), ("J2", JG, "C", ["STRIKE"], .45, 58, 9, 80, 3),
    ("J3", JG, "E", ["STRIKE", "RECCE"], .45, 81, 8, 28, 0), ("J4", JG, "B", ["STRIKE"], .45, 77, 5, 36, 1),
    ("G1", MG, "C", ["CAP"], .40, 90, 7, 25, 0), ("G2", MG, "D", ["CAP"], .40, 85, 1.5, 33, 1),
    ("G3", MG, "A", ["CAP"], .40, 68, 6.5, 70, 2),
    ("T1", TJ, "A", MULTI, .38, 95, 8, 10, 0), ("T2", TJ, "C", ["CAP", "RECCE"], .38, 79, 2.5, 40, 1),
    ("T3", TJ, "D", MULTI, .38, 92, 7, 14, 0), ("T4", TJ, "B", ["CAP", "RECCE"], .38, 88, 8, 22, 0),
    ("V1", MR, "E", MULTI, .50, 90, 8, 18, 0), ("V2", MR, "B", ["STRIKE", "RECCE"], .50, 84, 7, 41, 1),
    ("V3", MR, "E", ["CAP", "RECCE"], .50, 76, 6, 55, 2),
]


def fresh_aircraft():
    return [dict(id=i, type=t, base=b, roles=r, range=rg, serv=float(s), duty=d,
                 hrs=float(h), faults=f, fault=0, grounded=False)
            for i, t, b, r, rg, s, d, h, f in _AC]


WEAPON = {"CAP": "AAM", "STRIKE": "PGM", "SEAD": "ARM", "RECCE": "ISR"}


def _mk(id, name, type_, prio, need, hours, x, y, wl, per, **kw):
    return dict(id=id, name=name, type=type_, prio=prio, need=need, hours=hours,
                x=x, y=y, wl=wl, per=per, weapon=WEAPON[type_], **kw)


def fresh_missions():
    return [
        _mk("M1",  "Combat air patrol, north sector",   "CAP",    3, 2, 3, .30, .10, 90, 2),
        _mk("M2",  "Precision strike, forward depot",   "STRIKE", 4, 2, 3, .64, .12, 60, 2),
        _mk("M3",  "SEAD for the depot strike",         "SEAD",   4, 1, 3, .60, .18, 70, 2),
        _mk("M4",  "Maritime reconnaissance",           "RECCE",  2, 1, 4, .92, .64, 50, 1),
        _mk("M5",  "Close air support, southern axis",  "STRIKE", 3, 2, 3, .50, .93, 55, 1),
        _mk("M6",  "Forward base air defence",          "CAP",    2, 1, 3, .80, .38, 90, 2),
        _mk("M7",  "Strike on radar site, west",        "STRIKE", 4, 2, 3, .20, .60, 55, 2),
        _mk("M8",  "Border reconnaissance",             "RECCE",  3, 1, 3, .06, .10, 45, 1),
        _mk("M9",  "Convoy escort, eastern road",       "CAP",    3, 2, 3, .72, .68, 80, 2),
        _mk("M10", "SEAD, western corridor",            "SEAD",   3, 1, 3, .22, .54, 70, 2),
        _mk("M11", "Airfield denial, south-east",       "STRIKE", 3, 2, 3, .90, .92, 60, 2),
        _mk("M12", "Combat air patrol, central",        "CAP",    2, 2, 3, .48, .46, 90, 2),
    ]


def popup_mission():
    return _mk("X1", "Intercept, unidentified track", "CAP", 5, 2, 2, .40, .36, 100, 2, popup=True)
