"""
Portfolio weight optimisation utilities.

quantum_result_to_portfolio:
  Takes QAOA output probabilities, evaluates the top-10 most probable
  binary selections, runs Markowitz max-Sharpe over each selection's
  chosen assets, and returns the selection with the best Sharpe ratio.
  This is the critical step that makes the quantum result competitive:
  QAOA finds WHICH assets to hold; Markowitz finds HOW MUCH of each.

optimize_classical:
  Full Markowitz max-Sharpe over all N assets (continuous weights),
  kept for internal benchmarking in tests. No longer sent to frontend.
"""
from __future__ import annotations

import numpy as np
from scipy.optimize import minimize

RISK_FREE = 0.04   # 4% annualised risk-free rate


# ──────────────────────────────────────────────────────────────
# Shared helpers
# ──────────────────────────────────────────────────────────────

def _portfolio_stats(
    weights: np.ndarray, mu: np.ndarray, sigma: np.ndarray
) -> tuple[float, float, float]:
    """Return (expected_return, volatility, sharpe)."""
    ret = float(weights @ mu)
    vol = float(np.sqrt(max(weights @ sigma @ weights, 0.0)))
    sharpe = (ret - RISK_FREE) / vol if vol > 1e-8 else 0.0
    return ret, vol, sharpe


def _markowitz_max_sharpe(
    mu_sub: np.ndarray,
    cov_sub: np.ndarray,
) -> np.ndarray:
    """
    Find max-Sharpe weights for a subset of assets.
    Returns weight vector summing to 1, all ≥ 0.
    """
    n = len(mu_sub)
    if n == 1:
        return np.array([1.0])

    def neg_sharpe(w: np.ndarray) -> float:
        ret = float(w @ mu_sub)
        vol = float(np.sqrt(max(w @ cov_sub @ w, 0.0)))
        return -(ret - RISK_FREE) / (vol + 1e-8)

    constraints = [{"type": "eq", "fun": lambda w: w.sum() - 1}]
    bounds = [(0.0, 1.0)] * n
    x0 = np.ones(n) / n

    best_w = x0
    best_val = neg_sharpe(x0)

    # Try several random starting points for robustness
    rng = np.random.default_rng(0)
    starts = [x0] + [rng.dirichlet(np.ones(n)) for _ in range(4)]
    for s in starts:
        try:
            res = minimize(
                neg_sharpe, s,
                method="SLSQP",
                bounds=bounds,
                constraints=constraints,
                options={"maxiter": 300, "ftol": 1e-9},
            )
            if res.success and neg_sharpe(res.x) < best_val:
                best_val = neg_sharpe(res.x)
                best_w = res.x
        except Exception:
            pass

    w = np.maximum(best_w, 0.0)
    w_sum = w.sum()
    return w / w_sum if w_sum > 1e-10 else np.ones(n) / n


def _generate_explanations(
    weights: np.ndarray,
    mu: np.ndarray,
    sigma: np.ndarray,
    tickers: list[str],
    names: dict[str, str],
) -> list[dict]:
    vols = np.sqrt(np.maximum(np.diag(sigma), 0.0))
    mu_mean = float(mu.mean())
    vol_mean = float(vols.mean())
    explanations = []
    for i, ticker in enumerate(tickers):
        if weights[i] < 0.001:
            continue
        name = names.get(ticker, ticker)
        sharpe_i = (mu[i] - RISK_FREE) / (vols[i] + 1e-8)
        if sharpe_i > 1.0:
            reason = (
                f"{name} offers strong risk-adjusted returns, making it "
                f"an efficient anchor for your portfolio."
            )
        elif mu[i] > mu_mean:
            reason = (
                f"{name} brings above-average expected returns that lift "
                f"the overall portfolio performance."
            )
        elif vols[i] < vol_mean:
            reason = (
                f"{name} adds stability — its price moves less than most "
                f"other assets in your selection."
            )
        else:
            reason = (
                f"{name} provides diversification that reduces the overall "
                f"risk of the portfolio."
            )
        explanations.append({"ticker": ticker, "reason": reason})
    return explanations


# ──────────────────────────────────────────────────────────────
# Quantum result → portfolio
# ──────────────────────────────────────────────────────────────

def quantum_result_to_portfolio(
    probs: np.ndarray,
    mu: np.ndarray,
    sigma: np.ndarray,
    tickers: list[str],
    names: dict[str, str],
) -> dict:
    """
    Convert QAOA output probabilities to a portfolio.

    Evaluates the top-10 most probable binary selections, runs
    Markowitz max-Sharpe optimisation over each selection's assets,
    and picks the selection with the highest Sharpe ratio.
    """
    N = len(tickers)
    top_indices = np.argsort(probs)[::-1][:15]

    best_sharpe = float("-inf")
    best_selection: list[int] = []
    best_weights = np.zeros(N)

    for idx in top_indices:
        if float(probs[idx]) < 0.002:
            continue
        selected = [q for q in range(N) if (idx >> q) & 1]
        if len(selected) < 2:
            continue

        sub_mu = mu[selected]
        sub_cov = sigma[np.ix_(selected, selected)]
        w_sub = _markowitz_max_sharpe(sub_mu, sub_cov)

        full_w = np.zeros(N)
        for k, i in enumerate(selected):
            full_w[i] = w_sub[k]

        _, _, sharpe = _portfolio_stats(full_w, mu, sigma)
        if sharpe > best_sharpe:
            best_sharpe = sharpe
            best_selection = selected
            best_weights = full_w

    # Fallback: if nothing useful found, pick top N//3 by individual Sharpe
    if not best_selection:
        vols = np.sqrt(np.maximum(np.diag(sigma), 1e-12))
        sharpes_i = (mu - RISK_FREE) / vols
        top_k = max(2, N // 3)
        best_selection = list(np.argsort(sharpes_i)[::-1][:top_k])
        sub_mu = mu[best_selection]
        sub_cov = sigma[np.ix_(best_selection, best_selection)]
        w_sub = _markowitz_max_sharpe(sub_mu, sub_cov)
        best_weights = np.zeros(N)
        for k, i in enumerate(best_selection):
            best_weights[i] = w_sub[k]

    ret, vol, sharpe = _portfolio_stats(best_weights, mu, sigma)

    allocations = [
        {
            "ticker": tickers[i],
            "weight": float(best_weights[i]),
            "name": names.get(tickers[i], tickers[i]),
        }
        for i in best_selection
    ]
    explanations = _generate_explanations(best_weights, mu, sigma, tickers, names)

    return {
        "allocations": allocations,
        "expected_return": ret,
        "volatility": vol,
        "sharpe": sharpe,
        "explanations": explanations,
    }


# ──────────────────────────────────────────────────────────────
# Classical Markowitz (kept for testing)
# ──────────────────────────────────────────────────────────────

def optimize_classical(
    mu: np.ndarray,
    sigma: np.ndarray,
    tickers: list[str],
    names: dict[str, str],
    target_return: float | None = None,
) -> dict:
    N = len(mu)

    def neg_sharpe(w: np.ndarray) -> float:
        ret = float(w @ mu)
        vol = float(np.sqrt(max(w @ sigma @ w, 0.0)))
        return -(ret - RISK_FREE) / (vol + 1e-8)

    constraints: list[dict] = [{"type": "eq", "fun": lambda w: w.sum() - 1}]
    if target_return is not None:
        constraints.append({"type": "ineq", "fun": lambda w: float(w @ mu) - target_return})

    res = minimize(
        neg_sharpe,
        np.ones(N) / N,
        method="SLSQP",
        bounds=[(0.0, 1.0)] * N,
        constraints=constraints,
        options={"maxiter": 500, "ftol": 1e-9},
    )
    weights = np.maximum(res.x, 0.0)
    weights /= weights.sum()
    ret, vol, sharpe = _portfolio_stats(weights, mu, sigma)

    return {
        "allocations": [
            {"ticker": tickers[i], "weight": float(weights[i]), "name": names.get(tickers[i], tickers[i])}
            for i in range(N) if weights[i] > 0.001
        ],
        "expected_return": ret,
        "volatility": vol,
        "sharpe": sharpe,
        "explanations": _generate_explanations(weights, mu, sigma, tickers, names),
    }
