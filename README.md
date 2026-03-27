# QuantumFolio

> **Proof of concept.** A quantum-inspired portfolio optimiser that runs entirely on classical hardware, designed to be drop-in replaceable with a real quantum computer the moment one is available.

QuantumFolio lets anyone build an optimised investment portfolio using a quantum algorithm — no finance background, no physics degree required. Pick your stocks, set how much risk you're comfortable with, and watch the quantum solver work in real time: probability distributions collapsing, quantum states rotating on the Bloch sphere, energy descending toward the optimum. When it finishes, you get a plain-language breakdown of exactly which assets to hold and why.

---

## Quick Start

**Requirements:** Python ≥ 3.11, Node.js ≥ 18, [`uv`](https://docs.astral.sh/uv/getting-started/installation/)

```bash
# Terminal 1 — backend
cd backend
uv run uvicorn main:app --reload
# → API running at http://localhost:8000

# Terminal 2 — frontend
cd frontend
npm install        # first time only
npm run dev
# → UI running at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173), search for stocks by company name or ticker, set your risk preference, and click **Find My Portfolio**.

---

## What This Is

### The Problem

Portfolio construction is one of the most studied problems in quantitative finance, yet it remains practically inaccessible to individuals. The core task — deciding *which* assets to hold and in *what proportion* so that expected return is maximised for a given level of risk — is computationally expensive at scale and usually locked behind institutional tools.

At its heart, selecting which subset of assets to include (the combinatorial part) is an **NP-hard problem**: as the number of candidate assets grows, the number of possible subsets grows exponentially. For 20 assets there are over one million possible portfolios. For 50 assets, over one quadrillion. Classical computers brute-force their way through simplified approximations; they do not search the full space.

Quantum computers offer a fundamentally different approach.

### The Quantum Advantage

Quantum processors exploit **superposition** and **interference** to evaluate all possible asset combinations simultaneously. A quantum register of *N* qubits holds a superposition of all 2ᴺ possible portfolios at once. A quantum algorithm can then constructively interfere the amplitudes of good portfolios (high return, low risk) and destructively interfere the amplitudes of bad ones, collapsing toward the optimal solution in far fewer steps than classical search.

This is not science fiction — it is the principle behind the **Quantum Approximate Optimisation Algorithm (QAOA)**, a near-term quantum algorithm designed precisely for combinatorial problems of this kind.

### Why a Simulation?

Today's quantum hardware — NISQ (Noisy Intermediate-Scale Quantum) devices — has 50–1000 qubits but suffers from gate errors, decoherence, and limited circuit depth. For a demonstration of the *method* to be reliable and reproducible, QuantumFolio runs the same QAOA algorithm on a **classical statevector simulator**: a numpy array of 2ᴺ complex amplitudes that exactly represents the quantum state. This is slow compared to real hardware for large N, but it is mathematically identical.

**The architecture is designed for a one-line swap.** The entire quantum core (`backend/quantum/qaoa.py`) is self-contained. Replacing the numpy statevector simulator with calls to IBM Quantum, AWS Braket, or Azure Quantum Workspace requires changing only how `_compute_state` is evaluated — the QUBO formulation, the optimiser, the result extraction, and every line of the frontend are completely unchanged.

---

## Architecture

```
hqrbr/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, WebSocket route
│   ├── models.py                # Pydantic request/response models
│   ├── api/
│   │   ├── routes.py            # POST /api/optimize, GET /api/tickers/search
│   │   └── websocket.py         # Per-job async queue, WS handler
│   ├── data/
│   │   ├── fetcher.py           # yfinance → log-returns → μ, Σ
│   │   └── tickers.py           # ~300-ticker fuzzy-search index
│   └── quantum/
│       ├── qubo.py              # Financial objective → QUBO matrix Q
│       ├── qaoa.py              # Statevector QAOA, SPSA+Adam optimiser
│       ├── circuit.py           # Gate-list builder for SVG renderer
│       └── classical.py         # Markowitz max-Sharpe (scipy SLSQP)
└── frontend/
    └── src/
        ├── App.tsx              # Error boundary + view router
        ├── store.ts             # Zustand global state + playbackIdx
        ├── api.ts               # fetch + WebSocket client
        ├── types.ts             # TypeScript interfaces
        ├── views/
        │   ├── InputView.tsx    # Ticker search, risk slider
        │   ├── SolverView.tsx   # 6 live visualisation components
        │   └── ResultsView.tsx  # Portfolio + timeline replay slider
        └── components/
            ├── LossChart.tsx    # Recharts: energy over iterations
            ├── ProbabilityChart.tsx  # Recharts: top portfolio probs
            ├── CircuitDiagram.tsx    # SVG: live circuit rendering
            ├── BlochSphere.tsx       # React Three Fiber: qubit state
            ├── Narration.tsx         # Plain-English solver description
            └── ProgressBar.tsx      # Iteration progress + ETA
```

**Data flow:**

```
User submits tickers + risk preference
    → POST /api/optimize  →  job_id returned
    → WebSocket /ws/{job_id} opened
    → yfinance fetches 1 year of daily prices
    → log-returns computed → μ, Σ built
    → QUBO matrix constructed
    → QAOA runs (3 restarts × 30 iterations)
    → each iteration: snapshot streamed over WebSocket
    → frontend updates 6 visualisations in real time (~20 seconds)
    → solver finishes → Markowitz weights applied to best selection
    → result pushed → frontend transitions to Results view
```

---

## The Mathematics

### 1. Financial Data Preparation

For *N* assets with daily closing prices {*pᵢₜ*}, we compute **log-returns**:

```
rᵢₜ = ln(pᵢₜ / pᵢ,ₜ₋₁)
```

Log-returns are preferred over simple returns because they are time-additive and better approximate a normal distribution. From one year of daily data we then compute:

**Annualised expected return vector μ ∈ ℝᴺ:**
```
μᵢ = 252 · E[rᵢₜ]
```

**Annualised covariance matrix Σ ∈ ℝᴺˣᴺ:**
```
Σᵢⱼ = 252 · Cov(rᵢₜ, rⱼₜ)
```

The factor of 252 annualises from daily to yearly (approximate trading days per year). The diagonal entries Σᵢᵢ are the variance of each asset; the off-diagonal entries capture how assets move together. A high Σᵢⱼ means assets *i* and *j* rise and fall together, offering little diversification benefit.

---

### 2. The Classical Approach: Markowitz Mean-Variance Optimisation

The Nobel Prize–winning framework due to Harry Markowitz (1952) treats portfolio construction as a continuous optimisation problem. Given weight vector **w ∈ ℝᴺ** with **1ᵀw = 1** and **wᵢ ≥ 0**, the portfolio's expected return and variance are:

```
E[rₚ] = μᵀw
Var[rₚ] = wᵀΣw
```

The **Sharpe ratio** — return above the risk-free rate per unit of risk — is:

```
S = (μᵀw − rƒ) / √(wᵀΣw)
```

where *rƒ* ≈ 4% is the risk-free rate. **Markowitz optimisation finds the weight vector that maximises the Sharpe ratio**, which lies on the *efficient frontier*: the set of portfolios with the highest return for each level of risk.

QuantumFolio solves this using **scipy's SLSQP** (Sequential Least-Squares Programming), a gradient-based constrained optimisation algorithm:

```
maximise   (μᵀw − rƒ) / √(wᵀΣw)
subject to  Σwᵢ = 1
            wᵢ ≥ 0  ∀i
```

**The limitation:** this formulation allows infinitesimally small allocations to many assets. In practice, transaction costs and minimum position sizes mean you can only hold a small *discrete* subset. Deciding *which* K out of N assets to include at all is the hard combinatorial problem that classical optimisation sidesteps by working continuously. This is exactly where quantum optimisation excels.

---

### 3. The Quantum Approach: QAOA

#### 3a. Problem Encoding as QUBO

We reformulate the portfolio selection problem in terms of **binary variables** xᵢ ∈ {0, 1}, where xᵢ = 1 means asset *i* is selected and xᵢ = 0 means it is excluded. The goal is to find the binary vector **x** that minimises the objective:

```
f(x) = −λ · μᵀx  +  (1−λ) · xᵀΣx  +  A · (Σxᵢ − K)²
```

Where:
- **λ ∈ [0,1]** is the user's risk aversion parameter (higher → prioritise return)
- **K** is the target number of assets to select (~N/3)
- **A** is a penalty coefficient enforcing the cardinality constraint

This is a **Quadratic Unconstrained Binary Optimisation (QUBO)** problem — a class of combinatorial problems that maps naturally onto quantum hardware. It can be written in matrix form:

```
f(x) = xᵀQx     (absorbing the linear terms into the diagonal)
```

where the QUBO matrix **Q ∈ ℝᴺˣᴺ** encodes both the financial objective and the cardinality penalty. Expanding the penalty term using xᵢ² = xᵢ (binary property):

```
(Σxᵢ − K)² = (1−2K)Σxᵢ  +  2·Σᵢ<ⱼ xᵢxⱼ  +  K²
```

This contributes **A·(1−2K)** to each diagonal entry Q[i,i] and **A** to each off-diagonal entry Q[i,j] (i ≠ j).

**Scale balancing** is critical: the financial terms and the penalty must be on comparable scales, otherwise the optimiser focuses entirely on satisfying the cardinality constraint and ignores the financial objective. QuantumFolio normalises the financial terms first, sets the penalty equal to the resulting financial scale, then normalises the entire Q matrix so that all entries lie in [−1, 1]. This keeps the QAOA angle parameters in a natural operating range.

#### 3b. Mapping to the Quantum Hamiltonian

QUBO maps to an **Ising Hamiltonian** via the substitution xᵢ = (1 − σᵢᶻ)/2, where σᵢᶻ is the Pauli-Z operator acting on qubit *i*. The cost Hamiltonian *Hc* is diagonal in the computational basis: its eigenvalue for basis state |x⟩ (binary string x) is exactly f(x). The quantum algorithm seeks the ground state of this Hamiltonian.

#### 3c. The QAOA Circuit

QAOA prepares a parameterised quantum state through alternating layers of two unitaries:

**Initial state:** Uniform superposition over all 2ᴺ portfolios:
```
|ψ₀⟩ = |+⟩⊗ᴺ = (1/√2ᴺ) Σₓ |x⟩
```

This is achieved by applying a Hadamard gate to every qubit. At this moment, every possible portfolio has equal probability — the solver has literally not committed to any of them yet.

**Problem unitary** (applied *p* times):
```
Uc(γ) = exp(−iγHc) = diag(exp(−iγ·f(x)))
```

This is a diagonal phase gate: each basis state |x⟩ acquires a phase proportional to its cost f(x). It encodes the financial objective directly into the quantum amplitudes.

**Mixer unitary** (applied *p* times):
```
Ub(β) = exp(−iβHb) = ⊗ᴺ Rx(2β)
```

where Hb = −Σᵢ σᵢˣ is the transverse-field mixer Hamiltonian and Rx(θ) is a single-qubit rotation about the X axis. This unitary mixes the amplitudes between states that differ by one bit — allowing the algorithm to "tunnel" between nearby portfolios.

After *p* layers the state is:
```
|ψ(γ,β)⟩ = Ub(βₚ)Uc(γₚ) · · · Ub(β₁)Uc(γ₁) |ψ₀⟩
```

The probability of measuring portfolio x is |⟨x|ψ(γ,β)⟩|².

#### 3d. Classical Outer Loop

The parameters {γ₁,…,γₚ, β₁,…,βₚ} are optimised by a classical outer loop to minimise the expected cost:

```
E(γ,β) = ⟨ψ(γ,β)| Hc |ψ(γ,β)⟩ = Σₓ |⟨x|ψ⟩|² · f(x)
```

QuantumFolio uses **SPSA (Simultaneous Perturbation Stochastic Approximation)** with **Adam momentum**:

- SPSA requires only **2 circuit evaluations per gradient estimate** regardless of the number of parameters (compared to 2d evaluations for finite-difference methods with d parameters). This is essential for real quantum hardware where circuit executions are expensive.
- A random perturbation vector Δ ∈ {−1,+1}ᵈ is drawn each step:

```
∇̃ₖ = [E(θ+cΔ) − E(θ−cΔ)] / (2c) · Δ⁻¹
```

- The learning rate and perturbation magnitude are **cosine-annealed** to start with broad exploration and end with fine convergence.
- **3 independent random restarts** are run sequentially; the best final energy is kept.

#### 3e. From Probabilities to Portfolio Weights

After optimisation, the final quantum state gives a probability distribution over all 2ᴺ portfolios. QuantumFolio:

1. Takes the **top 15 highest-probability** basis states
2. For each, runs a full **Markowitz max-Sharpe optimisation** over just the selected subset of assets
3. Returns the subset + weights with the best resulting Sharpe ratio

This hybrid approach is key: **QAOA decides which assets are worth considering** (the hard combinatorial part); **Markowitz decides how much to allocate to each** (the continuous part that classical solvers handle well). Neither approach alone is as strong.

#### 3f. The Bloch Sphere

The live **Bloch sphere** visualisation shows the quantum state of a single representative qubit (qubit 0). The state of qubit 0 is obtained by **tracing out** (averaging over) all other qubits, giving a 2×2 **reduced density matrix** ρ₀:

```
ρ₀ = Tr_{1,...,N-1}(|ψ⟩⟨ψ|)
```

The Bloch vector (x, y, z) is then:
```
x = 2·Re(ρ₀₀₁)
y = 2·Im(ρ₀₀₁)
z = ρ₀₀₀ − ρ₀₁₁
```

For a **pure single-qubit state** the vector lies on the surface of the unit sphere. Because our qubit is entangled with N−1 others, ρ₀ is a **mixed state** and the vector lies strictly inside the sphere. Its magnitude and direction evolve as the QAOA circuit deepens — the rotating sphere is a direct visualisation of the quantum optimisation in progress.

---

### 4. Complexity Comparison

| Approach | Problem type | Search space | Time complexity |
|---|---|---|---|
| Brute force | Combinatorial | Enumerate all 2ᴺ subsets | O(2ᴺ · N²) |
| Classical Markowitz | Continuous relaxation | Convex optimisation | O(N³) |
| QAOA (this project) | Binary + continuous | Quantum interference | O(p · N² · 2ᴺ) on simulator; O(p · N²) on hardware |

On a real quantum processor, each circuit evaluation is O(p · N²) in gate depth — the 2ᴺ factor disappears because the quantum state is stored in N physical qubits, not a classical array of 2ᴺ numbers. The simulator is expensive by necessity; the hardware is the payoff.

---

## Connecting to Real Quantum Hardware

The simulation is isolated in `backend/quantum/qaoa.py`. The function `_compute_state(params, p, cost, N)` is the only piece that needs replacing. On real hardware:

```python
# Current: classical statevector simulation
def _compute_state(params, p, cost, N):
    state = uniform_superposition(N)
    for k in range(p):
        state = apply_problem_unitary(state, params[k], cost)
        state = apply_mixer_unitary(state, params[p+k], N)
    return state   # returns 2^N complex amplitudes

# Future: real quantum hardware (IBM Quantum example)
from qiskit import QuantumCircuit
from qiskit_ibm_runtime import QiskitRuntimeService, Sampler

def _compute_state_hardware(params, p, Q, N, shots=4096):
    qc = build_qaoa_circuit(params, p, Q, N)   # same gate sequence
    sampler = Sampler(backend="ibm_brisbane")
    result = sampler.run(qc, shots=shots).result()
    return result.quasi_dists[0]   # sparse probability dict
```

The QUBO matrix, the SPSA optimiser, the result extraction, the WebSocket streaming, and the entire frontend are untouched. The only algorithmic difference: on hardware, you sample from the output distribution rather than reading exact amplitudes — which is why SPSA is used (it works with noisy estimates).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Python 3.11+, [`uv`](https://docs.astral.sh/uv/) |
| Web framework | FastAPI + Uvicorn |
| Quantum simulation | NumPy (statevector), SciPy (Markowitz, SLSQP) |
| Market data | yfinance (Yahoo Finance) |
| Frontend framework | React 19 + TypeScript + Vite |
| Styling | TailwindCSS v4 |
| State management | Zustand |
| 2D charts | Recharts |
| 3D visualisation | React Three Fiber + drei |
| Real-time transport | WebSocket (FastAPI native) |

---

## Limitations and Future Work

- **Simulator scale cap:** The statevector requires 2ᴺ complex numbers in memory. At N = 16 this is 1 MB; at N = 20 it is 16 MB. Beyond that, tensor-network methods or real hardware are needed.
- **QAOA depth:** With *p* = 2 layers, the circuit is shallow. Deeper circuits (p ≥ 5) generally converge to better solutions but are prohibitively slow on the simulator and noisy on current hardware.
- **No transaction costs or taxes:** The current model ignores fees, bid-ask spreads, and capital gains, all of which matter in practice.
- **1-year lookback:** Expected returns and covariance are estimated from the most recent year of daily data — a crude estimator that is sensitive to recent market regime.
- **No rebalancing:** The output is a one-shot static allocation, not a dynamic strategy.
- **Hardware noise:** When connecting to real devices, the optimiser will need additional noise-mitigation strategies (zero-noise extrapolation, readout error mitigation) to achieve results comparable to the noiseless simulation shown here.

---

## References

1. Markowitz, H. (1952). *Portfolio Selection*. The Journal of Finance, 7(1), 77–91.
2. Farhi, E., Goldstone, J., & Gutmann, S. (2014). *A Quantum Approximate Optimization Algorithm*. arXiv:1411.4028.
3. Spall, J. C. (1992). *Multivariate Stochastic Approximation Using a Simultaneous Perturbation Gradient Approximation*. IEEE Transactions on Automatic Control, 37(3), 332–341.
4. Egger, D. J. et al. (2020). *Quantum Computing for Finance: State-of-the-Art and Future Prospects*. IEEE Transactions on Quantum Engineering, 1, 1–24.
5. Kingma, D. P., & Ba, J. (2014). *Adam: A Method for Stochastic Optimization*. arXiv:1412.6980.
