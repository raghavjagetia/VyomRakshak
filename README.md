# VyomRakshak

SIH 2026 · PS 26250 · Team KO_KRAKENS (185374)

A working prototype of the solution in the idea deck: a FastAPI backend with a real
OR-Tools CP-SAT solver, a scikit-learn readiness model, simulated data feeds, role-based
access and a persistent audit log, serving a React operating picture.

## What is real
| Piece | Implementation |
|---|---|
| Allocation | OR-Tools CP-SAT: crew duty, range, role, serviceability, weapon stock and weather as hard constraints; maximises priority-weighted coverage |
| Retasking | Pop-up event re-solves under four policies, ranked by coverage minus crews disturbed |
| Predictive readiness | Gradient-boosted regressor (scikit-learn) for 48 h fault risk, trained on synthetic history at start-up |
| Shared picture | One server-side state, pushed to every browser over Server-Sent Events |
| RBAC | Enforced by the API (`X-Role` header) — the server returns 403 for actions outside your role |
| Audit trail | SQLite, server-side |
| Feeds | Simulated: freshness, outages (click a feed chip), optional random fault / weather events |

All data is synthetic: 5 bases, 24 aircraft, 12 missions (`app/data.py`).

## Layout
```
app/        FastAPI backend: solver.py (CP-SAT), readiness.py (ML), state.py (shared desk, RBAC, feeds), data.py (synthetic data)
frontend/   React + Vite source
web/        built frontend (output of `npm run build`), served by FastAPI. Committed so Render needs no Node build.
```

## Run locally
```
py -3.13 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --port 8000
```
Open http://localhost:8000. Open it in two tabs with different roles to watch them sync.

### Changing the frontend
```
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api to the backend on :8000
npm run build    # writes the production bundle into ../web (commit it before deploying)
```

## Deploy on Render
1. Push this folder to a GitHub repo.
2. Render → **New → Blueprint** → pick the repo (it reads `render.yaml`).
   Or **New → Web Service**: build `pip install -r requirements.txt`,
   start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Put the resulting URL in the "Live Demo Link" box of the deck.

Notes: the free plan sleeps after ~15 min idle (first visit then takes up to a minute; the page
shows a "connecting" banner), and its disk is wiped on each deploy, so the audit log resets then.
State is in memory, so run a single instance.

## API
`GET /api/state` · `GET /api/stream` (SSE) · `POST /api/weather` · `POST /api/missions/{id}/priority` ·
`POST /api/aircraft/{id}/ground` · `POST /api/publish` · `POST /api/popup` · `POST /api/coas/{i}/approve` ·
`POST /api/feeds/{name}/toggle` · `POST /api/sim` · `POST /api/reset` · docs at `/docs`
