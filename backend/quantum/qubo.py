"""
Build a QUBO matrix from financial data.

Problem: choose binary vector x ∈ {0,1}^N to minimise

    f(x) = -λ · μᵀx  +  (1-λ) · xᵀΣx  +  penalty · (Σxᵢ - K)²

where
    λ = risk_aversion (higher → prefer return over stability)
    μ = annualised expected returns
    Σ = annualised covariance matrix
    K = target number of selected assets (~N/3)
    penalty = keeps the portfolio size near K

Key fix: the penalty and financial terms are scaled to the same magnitude
before being combined, so the QAOA energy landscape reflects the financial
objective rather than just the asset-count constraint.
"""
import numpy as np


def build_qubo(
    mu: np.ndarray,
    sigma: np.ndarray,
    risk_aversion: float,
    target_assets: int | None = None,
) -> np.ndarray:
    """
    Return a normalised QUBO matrix Q (N×N).

    All entries lie in approximately [-1, 1] after normalisation, which
    keeps the QAOA phase parameters gamma in a natural operating range.
    """
    N = len(mu)
    K = target_assets if target_assets is not None else max(2, N // 3)
    lam = risk_aversion

    # ── Step 1: Build financial terms ────────────────────────────────
    # Normalise μ and Σ independently so each contributes at unit scale.
    mu_s = np.abs(mu).max() or 1.0
    sig_s = np.abs(sigma).max() or 1.0

    Q = np.zeros((N, N))

    # Return term:  -λ · μᵀx  →  diagonal
    for i in range(N):
        Q[i, i] -= lam * (mu[i] / mu_s)

    # Risk term:    (1-λ) · xᵀΣx
    Q += (1 - lam) * (sigma / sig_s)

    # ── Step 2: Measure financial scale ──────────────────────────────
    # Use the max absolute entry as the reference so we can match it.
    fin_scale = float(np.abs(Q).max()) or 1.0

    # ── Step 3: Add penalty at the SAME scale as financial terms ──────
    # penalty · (Σxᵢ - K)²  expands to:
    #   penalty · [(1-2K) Σxᵢ  +  2 Σᵢ<ⱼ xᵢxⱼ]  (ignoring const)
    # In QUBO form xᵀQx:
    #   diagonal Q[i,i] += penalty * (1 - 2K)
    #   off-diagonal Q[i,j] += penalty  (for all i≠j; both dirs)
    penalty = fin_scale  # equal weight to financial objective

    for i in range(N):
        Q[i, i] += penalty * (1 - 2 * K)
    for i in range(N):
        for j in range(N):
            if i != j:
                Q[i, j] += penalty

    # ── Step 4: Global normalisation to [-1, 1] ───────────────────────
    q_norm = float(np.abs(Q).max()) or 1.0
    Q /= q_norm

    return Q
