import os
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.websocket import ws_handler

app = FastAPI(title="QuantumFolio", version="0.1.0")

# ── Allowed origins ───────────────────────────────────────────────────────────
# Always permit local dev servers.
_origins: list[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# FRONTEND_URL  – primary production URL, e.g. https://quantumfolio.vercel.app
# FRONTEND_URLS – optional comma-separated list for extra origins
#                 (Vercel preview URLs, staging, custom domains, etc.)
for _env_key in ("FRONTEND_URL", "FRONTEND_URLS"):
    _val = os.getenv(_env_key, "")
    for _url in _val.split(","):
        _url = _url.strip().rstrip("/")   # normalise: no trailing slash
        if _url and _url not in _origins:
            _origins.append(_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str) -> None:
    await ws_handler(websocket, job_id)
