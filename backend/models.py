from pydantic import BaseModel, field_validator


class OptimizeRequest(BaseModel):
    tickers: list[str]
    risk_aversion: float  # 0.0 = growth, 1.0 = safety

    @field_validator("tickers")
    @classmethod
    def check_tickers(cls, v: list[str]) -> list[str]:
        if len(v) < 5 or len(v) > 20:
            raise ValueError("Must select between 5 and 20 tickers")
        return [t.upper().strip() for t in v]

    @field_validator("risk_aversion")
    @classmethod
    def check_risk(cls, v: float) -> float:
        if not (0.0 <= v <= 1.0):
            raise ValueError("risk_aversion must be between 0 and 1")
        return v


class OptimizeResponse(BaseModel):
    job_id: str


class TickerSuggestion(BaseModel):
    ticker: str
    name: str


class Allocation(BaseModel):
    ticker: str
    weight: float
    name: str


class Explanation(BaseModel):
    ticker: str
    reason: str


class Portfolio(BaseModel):
    allocations: list[Allocation]
    expected_return: float
    volatility: float
    sharpe: float
    explanations: list[Explanation]


class FinalResult(BaseModel):
    quantum: Portfolio
    classical: Portfolio
