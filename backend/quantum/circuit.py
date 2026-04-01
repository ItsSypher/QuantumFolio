"""Build a JSON-serialisable representation of the QAOA circuit."""
from __future__ import annotations


def build_circuit_repr(
    n_qubits: int,
    p_layers: int,
    gammas: list[float] | None = None,
    betas: list[float] | None = None,
) -> list[dict]:
    """
    Return a list of Gate dicts describing a p-layer QAOA circuit.
    Gates: H (Hadamard), RZ (problem phase), CNOT (entanglement), RX (mixer).

    When gammas/betas are supplied, each RZ/RX gate includes an "angle" field
    with the current optimiser parameter so the diagram is genuinely dynamic.
    """
    gates: list[dict] = []
    layer = 0

    # Initial Hadamard layer
    for q in range(n_qubits):
        gates.append({"type": "H", "qubit": q, "layer": layer})
    layer += 1

    # p QAOA layers
    for k in range(p_layers):
        # Problem unitary: RZ on each qubit + CNOT pairs (sampled subset for clarity)
        for q in range(n_qubits):
            gate: dict = {"type": "RZ", "qubit": q, "layer": layer}
            if gammas is not None and k < len(gammas):
                gate["angle"] = round(gammas[k], 3)
            gates.append(gate)
        layer += 1

        # Entanglement (show a subset — nearest-neighbour)
        for q in range(min(n_qubits - 1, 6)):
            gates.append({"type": "CNOT", "qubit": q, "target": q + 1, "layer": layer})
        layer += 1

        # Mixer unitary: RX on each qubit
        for q in range(n_qubits):
            gate = {"type": "RX", "qubit": q, "layer": layer}
            if betas is not None and k < len(betas):
                gate["angle"] = round(betas[k], 3)
            gates.append(gate)
        layer += 1

    return gates
