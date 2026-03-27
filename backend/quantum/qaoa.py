"""
Pure-numpy statevector QAOA for portfolio optimisation.

Optimiser: SPSA (Simultaneous Perturbation Stochastic Approximation)
  - Only 2 cost evaluations per gradient estimate (vs 2·d for finite diff)
  - Learning rate and perturbation magnitude are cosine-annealed
  - 3 independent random restarts; best final energy wins

State vector: complex numpy array of shape (2**N,).
Each basis index i ∈ [0, 2^N) encodes a binary portfolio: bit k of i = xₖ.
"""
from __future__ import annotations

import math
from collections.abc import Generator
from typing import Any

import numpy as np

from .qubo import build_qubo
from .circuit import build_circuit_repr

# ──────────────────────────────────────────────────────────────
# Pre-compute bit matrix
# ──────────────────────────────────────────────────────────────

def _make_bits(N: int) -> np.ndarray:
    """Return (2^N, N) float64 matrix: bits[i, q] = (i >> q) & 1."""
    dim = 2 ** N
    idx = np.arange(dim, dtype=np.uint64)
    bits = np.zeros((dim, N), dtype=np.float64)
    for q in range(N):
        bits[:, q] = (idx >> q) & 1
    return bits


# ──────────────────────────────────────────────────────────────
# Statevector unitaries
# ──────────────────────────────────────────────────────────────

def _cost_vector(Q: np.ndarray, bits: np.ndarray) -> np.ndarray:
    """cost[i] = bits[i] @ Q @ bits[i] for every basis state i."""
    return np.einsum("ij,jk,ik->i", bits, Q, bits)


def _apply_problem_unitary(
    state: np.ndarray,
    gamma: float,
    cost: np.ndarray,
) -> np.ndarray:
    """U_C(γ) = diag(exp(-iγ·cost)) applied to state."""
    return state * np.exp(-1j * gamma * cost)


def _apply_mixer_unitary(state: np.ndarray, beta: float, N: int) -> np.ndarray:
    """U_B(β) = ⊗ Rx(2β) applied qubit by qubit."""
    dim = 2 ** N
    cos_b = math.cos(beta)
    sin_b = math.sin(beta)
    for q in range(N):
        mask = 1 << q
        new_state = np.empty(dim, dtype=complex)
        for i in range(dim):
            j = i ^ mask
            new_state[i] = cos_b * state[i] - 1j * sin_b * state[j]
        state = new_state
    return state


def _compute_state(
    params: np.ndarray,
    p: int,
    cost: np.ndarray,
    N: int,
) -> np.ndarray:
    dim = 2 ** N
    state = np.ones(dim, dtype=complex) / math.sqrt(dim)
    gammas, betas = params[:p], params[p:]
    for k in range(p):
        state = _apply_problem_unitary(state, gammas[k], cost)
        state = _apply_mixer_unitary(state, betas[k], N)
    return state


def _energy(state: np.ndarray, cost: np.ndarray) -> float:
    return float((np.abs(state) ** 2) @ cost)


# ──────────────────────────────────────────────────────────────
# Bloch vector for qubit 0
# ──────────────────────────────────────────────────────────────

def _bloch_vector(state: np.ndarray, N: int) -> tuple[float, float, float]:
    dim = 2 ** N
    rho00 = rho11 = rho01 = complex(0)
    for i in range(dim):
        j = i ^ 1  # flip qubit 0
        amp = state[i]
        if (i & 1) == 0:  # qubit 0 is |0>
            rho00 += amp * amp.conjugate()
            if j < dim:
                rho01 += amp * state[j].conjugate()
        else:
            rho11 += amp * amp.conjugate()
    x = float(2 * rho01.real)
    y = float(2 * rho01.imag)
    z = float((rho00 - rho11).real)
    norm = math.sqrt(x * x + y * y + z * z) or 1.0
    return x / norm, y / norm, z / norm


# ──────────────────────────────────────────────────────────────
# SPSA optimiser
# ──────────────────────────────────────────────────────────────

def _spsa_step(
    params: np.ndarray,
    c: float,
    rng: np.random.Generator,
    p_layers: int,
    cost: np.ndarray,
    N: int,
) -> np.ndarray:
    """Return SPSA gradient estimate."""
    d = len(params)
    delta = rng.choice([-1.0, 1.0], size=d)
    p_plus = params + c * delta
    p_minus = params - c * delta
    f_plus = _energy(_compute_state(p_plus, p_layers, cost, N), cost)
    f_minus = _energy(_compute_state(p_minus, p_layers, cost, N), cost)
    return (f_plus - f_minus) / (2 * c) * (1.0 / delta)


# ──────────────────────────────────────────────────────────────
# Narration
# ──────────────────────────────────────────────────────────────

def _narrate(
    iteration: int,
    max_iters: int,
    loss: float,
    top_portfolios: list[dict],
    N: int,
) -> str:
    frac = iteration / max_iters
    total_states = 2 ** N
    top = top_portfolios[0] if top_portfolios else None
    top_label = top["label"] if top else "the best combination"
    top_prob = f"{top['probability'] * 100:.1f}%" if top else ""

    if frac < 0.30:
        return (
            f"The quantum solver is exploring {total_states:,} possible portfolio "
            f"combinations simultaneously. It is mapping the landscape of "
            f"possibilities and learning which combinations perform best."
        )
    elif frac < 0.65:
        return (
            f"The solver is concentrating — the leading candidate is {top_label} "
            f"with {top_prob} probability. Quantum interference is suppressing "
            f"weaker portfolios and amplifying the best ones. "
            f"Energy: {loss:.4f}."
        )
    else:
        return (
            f"Almost there. Fine-tuning the quantum circuit parameters. "
            f"The leading portfolio is {top_label} with {top_prob} probability. "
            f"The circuit is converging on the optimal solution."
        )


# ──────────────────────────────────────────────────────────────
# Main QAOA runner
# ──────────────────────────────────────────────────────────────

def run_qaoa(
    mu: np.ndarray,
    sigma: np.ndarray,
    tickers: list[str],
    risk_aversion: float,
    p_layers: int = 2,
    max_iters: int = 100,
    n_restarts: int = 3,
) -> Generator[dict[str, Any], None, np.ndarray]:
    """
    Generator yielding SolverSnapshot dicts during optimisation.
    Returns final probability array via StopIteration.value.

    Runs `n_restarts` independent random initialisations for robustness,
    collecting `max_iters // n_restarts` iterations from each.
    Returns the state from the restart with the lowest final energy.
    """
    N = len(mu)
    if N > 16:
        raise ValueError(f"Too many assets ({N}). Maximum is 16 for statevector simulation.")

    Q = build_qubo(mu, sigma, risk_aversion)
    bits = _make_bits(N)
    cost = _cost_vector(Q, bits)

    # Iterations per restart
    iters_per_restart = max(20, max_iters // n_restarts)
    total_iters = iters_per_restart * n_restarts

    rng = np.random.default_rng(42)

    global_best_energy = float("inf")
    global_best_params: np.ndarray | None = None
    cumulative_iter = 0

    for _ in range(n_restarts):
        # Random initialisation — good starting range for QAOA is (0, π)
        params = rng.uniform(0.1, math.pi * 0.9, 2 * p_layers)

        # Adam state (we use Adam + SPSA gradient)
        lr_init = 0.3
        beta1, beta2, eps_adam = 0.9, 0.99, 1e-8
        m = np.zeros_like(params)
        v = np.zeros_like(params)

        local_best_energy = float("inf")

        for local_it in range(1, iters_per_restart + 1):
            cumulative_iter += 1
            t = cumulative_iter  # global step for Adam bias correction

            # Cosine-annealed perturbation magnitude (starts 0.3 → ends 0.05)
            frac = local_it / iters_per_restart
            c_spsa = 0.3 * (0.5 + 0.5 * math.cos(math.pi * frac)) + 0.05

            grad = _spsa_step(params, c_spsa, rng, p_layers, cost, N)

            # Adam update
            m = beta1 * m + (1 - beta1) * grad
            v = beta2 * v + (1 - beta2) * grad ** 2
            m_hat = m / (1 - beta1 ** t)
            v_hat = v / (1 - beta2 ** t)

            # Cosine-annealed learning rate
            lr = lr_init * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * frac)))
            params = params - lr * m_hat / (np.sqrt(v_hat) + eps_adam)

            state = _compute_state(params, p_layers, cost, N)
            energy = _energy(state, cost)

            if energy < local_best_energy:
                local_best_energy = energy
            if energy < global_best_energy:
                global_best_energy = energy
                global_best_params = params.copy()

            probs = np.abs(state) ** 2

            # Top portfolios by probability
            top_idx = np.argsort(probs)[::-1][:5]
            top_portfolios: list[dict] = []
            for idx in top_idx:
                assets = [tickers[q] for q in range(N) if (idx >> q) & 1]
                if not assets:
                    continue
                label = " + ".join(assets[:4]) + ("…" if len(assets) > 4 else "")
                top_portfolios.append({
                    "assets": assets,
                    "probability": float(probs[idx]),
                    "label": label,
                })

            bloch = _bloch_vector(state, N)
            # Gradually reveal deeper circuit as restarts progress
            display_p = min(p_layers, 1 + cumulative_iter // (total_iters // (p_layers + 1)))
            circuit_repr = build_circuit_repr(min(N, 8), display_p)

            status = "converged" if cumulative_iter == total_iters else "running"
            snapshot: dict[str, Any] = {
                "iteration": cumulative_iter,
                "max_iterations": total_iters,
                "loss": float(energy),
                "parameters": params.tolist(),
                "circuit_depth": display_p * 3 + 1,
                "circuit_repr": circuit_repr,
                "top_portfolios": top_portfolios,
                "bloch_state": list(bloch),
                "narration": _narrate(cumulative_iter, total_iters, energy, top_portfolios, N),
                "status": status,
            }
            yield snapshot

        # Warm-start next restart from the best found so far
        if global_best_params is not None:
            # Add small noise around best params
            params = global_best_params + rng.normal(0, 0.1, 2 * p_layers)

    # Final state from global best parameters
    if global_best_params is None:
        global_best_params = params
    final_state = _compute_state(global_best_params, p_layers, cost, N)
    return np.abs(final_state) ** 2
