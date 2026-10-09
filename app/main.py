import asyncio
import json
import os
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, Request
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .data import BASES, fresh_aircraft, fresh_missions, popup_mission
from .solver import make_coas, solve
from .state import Desk

desk = Desk()
WEB = os.path.join(os.path.dirname(__file__), "..", "web")


@asynccontextmanager
async def lifespan(_):
    async def ticker():
        while True:
            await asyncio.sleep(2)
            desk.tick()
    task = asyncio.create_task(ticker())
    yield
    task.cancel()


app = FastAPI(title="VyomRakshak API", lifespan=lifespan)
Role = Header(default="planner", alias="X-Role")


class Weather(BaseModel):
    value: int


class Priority(BaseModel):
    delta: int


class Sim(BaseModel):
    on: bool


@app.get("/api/health")
def health():
    return {"ok": True, "version": desk.version}


_demo = {}


@app.get("/api/demo")
def demo():
    """Fixed baseline plan plus its best re-plan after a pop-up, for the landing-page replay."""
    if not _demo:
        ac, ms = fresh_aircraft(), fresh_missions()
        for a, f in zip(ac, desk.ready.predict(ac)):
            a["fault"] = f
        base = solve(ac, ms, 30)
        best = make_coas(base, ac, ms + [popup_mission()], 30)[0]
        _demo.update(aircraft=ac, missions=ms, popup=popup_mission(), bases=BASES, base=base,
                     replan={"title": best["title"], "lines": best["lines"], "plan": best["plan"]})
    return _demo


@app.get("/api/state")
def state():
    return desk.snapshot()


@app.get("/api/stream")
async def stream(request: Request):
    async def gen():
        last, sent = -1, 0.0
        while not await request.is_disconnected():
            if desk.version != last or time.time() - sent > 2:
                last, sent = desk.version, time.time()
                yield f"data: {json.dumps(desk.snapshot())}\n\n"
            await asyncio.sleep(.4)
    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/weather")
def weather(b: Weather, role: str = Role):
    desk.set_weather(b.value, role)
    return desk.snapshot()


@app.post("/api/missions/{mid}/priority")
def priority(mid: str, b: Priority, role: str = Role):
    desk.priority(mid, b.delta, role)
    return desk.snapshot()


@app.post("/api/aircraft/{aid}/ground")
def ground(aid: str, role: str = Role):
    desk.ground(aid, role)
    return desk.snapshot()


@app.post("/api/publish")
def publish(role: str = Role):
    desk.publish(role)
    return desk.snapshot()


@app.post("/api/popup")
def popup(role: str = Role):
    desk.inject_popup(role)
    return desk.snapshot()


@app.post("/api/coas/{i}/approve")
def approve(i: int, role: str = Role):
    desk.approve_coa(i, role)
    return desk.snapshot()


@app.post("/api/feeds/{name}/toggle")
def feed(name: str, role: str = Role):
    desk.toggle_feed(name, role)
    return desk.snapshot()


@app.post("/api/sim")
def sim(b: Sim):
    desk.set_sim(b.on)
    return desk.snapshot()


@app.post("/api/reset")
def reset():
    desk.reset()
    return desk.snapshot()


app.mount("/", StaticFiles(directory=WEB, html=True), name="web")
