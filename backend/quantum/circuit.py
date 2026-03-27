"""Build a JSON-serialisable representation of the QAOA circuit."""
from __future__ import annotations


def build_circuit_repr(n_qubits: int, p_layers: int) -> list[dict]:
    """
    Return a list of Gate dicts describing a p-layer QAOA circuit.
    Gates: H (Hadamard), RZ (problem phase), CNOT (entanglement), RX (mixer).
    """
    gates: list[dict] = []
    layer = 0

    # Initial Hadamard layer
    for q in range(n_qubits):
        gates.append({"type": "H", "qubit": q, "layer": layer})
    layer += 1

    # p QAOA layers
    for _ in range(p_layers):
        # Problem unitary: RZ on each qubit + CNOT pairs (sampled subset for clarity)
        for q in range(n_qubits):
            gates.append({"type": "RZ", "qubit": q, "layer": layer})
        layer += 1

        # Entanglement (show a subset — nearest-neighbour)
        for q in range(min(n_qubits - 1, 6)):
            gates.append({"type": "CNOT", "qubit": q, "target": q + 1, "layer": layer})
        layer += 1

        # Mixer unitary: RX on each qubit
        for q in range(n_qubits):
            gates.append({"type": "RX", "qubit": q, "layer": layer})
        layer += 1

    return gates
