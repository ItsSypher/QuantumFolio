import numpy as np
import pandas as pd
import yfinance as yf
from typing import NamedTuple


class FinancialData(NamedTuple):
    tickers: list[str]
    names: dict[str, str]
    mu: np.ndarray        # annualised expected returns, shape (N,)
    sigma: np.ndarray     # annualised covariance matrix, shape (N, N)


def fetch_financial_data(tickers: list[str]) -> FinancialData:
    """Fetch 1 year of daily closes, compute log-returns, annualised μ and Σ."""
    raw = yf.download(tickers, period="1y", auto_adjust=True, progress=False)

    if raw.empty:
        raise ValueError("No data returned from Yahoo Finance")

    # Handle single ticker vs multiple
    if len(tickers) == 1:
        close = raw[["Close"]].copy()
        close.columns = tickers
    else:
        close = raw["Close"].copy()

    # Drop tickers with too many missing values (>10%)
    threshold = len(close) * 0.9
    close = close.dropna(axis=1, thresh=int(threshold))
    valid_tickers = list(close.columns)

    if len(valid_tickers) < 5:
        raise ValueError(
            f"Too few valid tickers — only got data for: {valid_tickers}. "
            "Check that your tickers are valid and try again."
        )

    close = close.dropna()
    log_returns = np.log(close / close.shift(1)).dropna()

    # Annualise
    mu = log_returns.mean().values * 252
    sigma = log_returns.cov().values * 252

    # Fetch company names
    names: dict[str, str] = {}
    for t in valid_tickers:
        try:
            info = yf.Ticker(t).info
            names[t] = info.get("shortName") or info.get("longName") or t
        except Exception:
            names[t] = t

    return FinancialData(
        tickers=valid_tickers,
        names=names,
        mu=mu,
        sigma=sigma,
    )
