"""Predictive readiness: gradient-boosted regressor for 48 h fault risk.

Trained at start-up on synthetic maintenance history (no real data is used or
shipped). In production the same interface would be fed by the maintenance adapter.
"""
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor


def _truth(hrs, faults, serv):
    return 2 + 0.28 * hrs + 6 * faults + 0.5 * np.maximum(0, 85 - serv)


class Readiness:
    def __init__(self, seed=7):
        rng = np.random.default_rng(seed)
        n = 3000
        hrs = rng.uniform(0, 120, n)
        faults = rng.integers(0, 5, n)
        serv = rng.uniform(45, 100, n)
        y = np.clip(_truth(hrs, faults, serv) + rng.normal(0, 2.5, n), 1, 95)
        self.model = GradientBoostingRegressor(n_estimators=120, max_depth=3, random_state=seed)
        self.model.fit(np.column_stack([hrs, faults, serv]), y)

    def predict(self, aircraft):
        X = np.array([[a["hrs"], a["faults"], a["serv"]] for a in aircraft])
        return [int(round(float(v))) for v in np.clip(self.model.predict(X), 1, 95)]
