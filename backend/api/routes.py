"""REST API routes."""
from __future__ import annotations

import asyncio

import numpy as np
from fastapi import APIRouter

from data.fetcher import fetch_financial_data
from data.tickers import search_tickers
from models import OptimizeRequest, OptimizeResponse, TickerSuggestion
from quantum.qaoa import run_qaoa
from quantum.classical import quantum_result_to_portfolio
from api.websocket import create_job, push_message, push_done

router = APIRouter()

# Total time in seconds the stream should take (gives the live-feel UX)
STREAM_DURATION_SECS = 20.0
MIN_SNAPSHOT_DELAY = 0.08   # never faster than 80 ms even with many snapshots


@router.get("/tickers/search", response_model=list[TickerSuggestion])
async def ticker_search(q: str = "") -> list[dict]:
    return search_tickers(q, limit=10)


@router.post("/optimize", response_model=OptimizeResponse)
async def start_optimize(req: OptimizeRequest) -> dict:
    job_id, queue = create_job()

    async def run() -> None:
        loop = asyncio.get_running_loop()

        # ── Fetch market data ──────────────────────────────────────────
        try:
            fin_data = await loop.run_in_executor(
                None, fetch_financial_data, req.tickers
            )
        except Exception as e:
            await push_message(queue, "error", {"message": str(e)})
            await push_done(queue)
            return

        tickers = fin_data.tickers
        mu = fin_data.mu
        sigma = fin_data.sigma
        names = fin_data.names
        N = len(tickers)

        p_layers = 2 if N <= 10 else 1
        max_iters = 90   # 3 restarts × 30 iterations each

        # ── Run QAOA synchronously in thread pool ──────────────────────
        def _run_sync():
            snapshots: list[dict] = []
            gen = run_qaoa(
                mu, sigma, tickers, req.risk_aversion,
                p_layers=p_layers, max_iters=max_iters, n_restarts=3,
            )
            try:
                while True:
                    snap = next(gen)
                    snapshots.append(snap)
            except StopIteration as exc:
                return snapshots, exc.value
            return snapshots, None

        try:
            snapshots, probs = await loop.run_in_executor(None, _run_sync)
        except Exception as e:
            await push_message(queue, "error", {"message": f"Solver error: {e}"})
            await push_done(queue)
            return

        # ── Stream snapshots — paced to fill STREAM_DURATION_SECS ─────
        n = len(snapshots)
        delay = max(MIN_SNAPSHOT_DELAY, STREAM_DURATION_SECS / max(n, 1))
        for snap in snapshots:
            await push_message(queue, "snapshot", snap)
            await asyncio.sleep(delay)

        # ── Build and send final result (quantum only) ─────────────────
        try:
            if probs is None:
                raise ValueError("Solver returned no final state")

            quantum_portfolio = quantum_result_to_portfolio(
                probs, mu, sigma, tickers, names
            )
            await push_message(queue, "result", {"quantum": quantum_portfolio})
        except Exception as e:
            await push_message(queue, "error", {"message": f"Result error: {e}"})

        await push_done(queue)

    asyncio.create_task(run())
    return {"job_id": job_id}
