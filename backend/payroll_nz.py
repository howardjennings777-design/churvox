"""
Churvox NZ Payroll Engine
=========================
Jurisdiction-aware calculation layer. NZ is fully implemented here; AU and
other jurisdictions can plug in later by adding a parallel `*_rules.py` module
and dispatching through `calculate_pay_line()`.

Effective values as of the 2024/25 NZ tax year. Update PAYE brackets and
KiwiSaver/ESCT thresholds when IRD publishes new ones — everything is in one
place here so you don't chase it across the codebase.
"""
from __future__ import annotations
from typing import Dict, List, Tuple


# ----- NZ PAYE tax thresholds (annual, 2024/25 composite) ------------------
# https://www.ird.govt.nz/income-tax/income-tax-for-individuals/tax-codes-and-tax-rates-for-individuals
NZ_PAYE_BRACKETS_ANNUAL: List[Tuple[float, float]] = [
    (14000,    0.105),   # 10.5% up to $14,000
    (48000,    0.175),   # 17.5% $14,001 - $48,000
    (70000,    0.30),    # 30%   $48,001 - $70,000
    (180000,   0.33),    # 33%   $70,001 - $180,000
    (float("inf"), 0.39),# 39%   $180,001+
]

# Student loan repayment — 12% of earnings over the pay-period threshold
NZ_STUDENT_LOAN_RATE = 0.12
NZ_STUDENT_LOAN_ANNUAL_THRESHOLD = 24128.00  # 2024/25

# KiwiSaver — employee options 3/4/6/8/10%, employer minimum 3%
NZ_KIWISAVER_EMPLOYEE_RATES = {3, 4, 6, 8, 10}
NZ_KIWISAVER_EMPLOYER_MIN = 0.03

# ESCT (Employer Superannuation Contribution Tax) on employer KS contribution
# Applied to the grossed-up annual equivalent of the employee's salary + employer contrib
NZ_ESCT_BRACKETS_ANNUAL: List[Tuple[float, float]] = [
    (16800,     0.105),
    (57600,     0.175),
    (84000,     0.30),
    (216000,    0.33),
    (float("inf"), 0.39),
]

# Pay period annualization multipliers
PAY_FREQUENCY_PERIODS = {
    "weekly": 52,
    "fortnightly": 26,
    "four_weekly": 13,
    "monthly": 12,
}


# ---------------------------------------------------------------------------
def _apply_bracket_tax(amount: float, brackets: List[Tuple[float, float]]) -> float:
    """Progressive tax calculation over bracket tuples [(ceiling, rate), ...]."""
    if amount <= 0:
        return 0.0
    tax = 0.0
    prev_ceiling = 0.0
    remaining = amount
    for ceiling, rate in brackets:
        slice_width = max(0.0, min(amount, ceiling) - prev_ceiling)
        if slice_width <= 0:
            prev_ceiling = ceiling
            continue
        tax += slice_width * rate
        prev_ceiling = ceiling
        remaining -= slice_width
        if remaining <= 0:
            break
    return round(tax, 2)


def paye_for_period(gross_for_period: float, pay_frequency: str, tax_code: str = "M") -> float:
    """
    Calculate PAYE for one pay period. Annualizes, applies brackets, scales back.
    Tax code handling:
      - M / M SL → primary, no secondary surcharge
      - ME / ME SL → primary, independent earner tax credit N/A in simple path
      - S / SH / ST / SA → secondary — use flat rates
      - WT → schedular payment (withholding tax) — applied at flat 20% as a safe default
    """
    code = (tax_code or "M").upper().strip().replace("  ", " ")
    periods = PAY_FREQUENCY_PERIODS.get(pay_frequency, 52)

    # Flat-rate secondary tax codes
    SECONDARY = {"S": 0.175, "SH": 0.30, "ST": 0.33, "SA": 0.39}
    for sec, rate in SECONDARY.items():
        if code.startswith(sec) and not code.startswith("SL"):
            return round(gross_for_period * rate, 2)

    if code.startswith("WT"):
        return round(gross_for_period * 0.20, 2)

    # Primary — annualize & apply brackets
    annual = max(0.0, gross_for_period) * periods
    annual_tax = _apply_bracket_tax(annual, NZ_PAYE_BRACKETS_ANNUAL)
    return round(annual_tax / periods, 2)


def kiwisaver_employee(gross_for_period: float, enrolled: bool, rate_pct: int = 3) -> float:
    if not enrolled:
        return 0.0
    if rate_pct not in NZ_KIWISAVER_EMPLOYEE_RATES:
        rate_pct = 3
    return round(gross_for_period * (rate_pct / 100.0), 2)


def kiwisaver_employer(gross_for_period: float, enrolled: bool, rate_pct: float = 3.0) -> float:
    if not enrolled:
        return 0.0
    rate = max(NZ_KIWISAVER_EMPLOYER_MIN, float(rate_pct) / 100.0)
    return round(gross_for_period * rate, 2)


def esct_for_period(employer_contribution: float, annual_gross_est: float) -> float:
    """ESCT is applied on employer KS contribution at a rate based on last year's
    annual equivalent of (gross + employer contributions)."""
    if employer_contribution <= 0:
        return 0.0
    # Find the bracket rate for the employee's annual equivalent
    esct_rate = 0.39
    prev_ceiling = 0.0
    for ceiling, rate in NZ_ESCT_BRACKETS_ANNUAL:
        if annual_gross_est <= ceiling:
            esct_rate = rate
            break
        prev_ceiling = ceiling
    return round(employer_contribution * esct_rate, 2)


def student_loan_for_period(gross_for_period: float, pay_frequency: str, applicable: bool) -> float:
    if not applicable:
        return 0.0
    periods = PAY_FREQUENCY_PERIODS.get(pay_frequency, 52)
    period_threshold = NZ_STUDENT_LOAN_ANNUAL_THRESHOLD / periods
    excess = max(0.0, gross_for_period - period_threshold)
    return round(excess * NZ_STUDENT_LOAN_RATE, 2)


def calculate_pay_line(
    *,
    gross_ordinary: float,
    gross_overtime: float = 0.0,
    gross_other: float = 0.0,
    pay_frequency: str = "weekly",
    tax_code: str = "M",
    kiwisaver_enrolled: bool = False,
    kiwisaver_employee_rate: int = 3,
    kiwisaver_employer_rate: float = 3.0,
    student_loan: bool = False,
    child_support: float = 0.0,
    other_deductions: float = 0.0,
    adjustments: float = 0.0,
    jurisdiction: str = "NZ",
) -> Dict:
    """
    Returns a full pay-line breakdown. All figures pre-rounded to 2dp.

    For non-NZ jurisdictions we return a clear `warnings` entry so the UI
    marks the run as "calculation not supported in this jurisdiction yet"
    — never fake values.
    """
    if jurisdiction.upper() != "NZ":
        return {
            "jurisdiction": jurisdiction.upper(),
            "supported": False,
            "warnings": [f"Payroll calculations not yet implemented for {jurisdiction}."],
            "gross_total": round(gross_ordinary + gross_overtime + gross_other + adjustments, 2),
            "net_total": 0.0,
        }

    gross = round(gross_ordinary + gross_overtime + gross_other + adjustments, 2)
    periods = PAY_FREQUENCY_PERIODS.get(pay_frequency, 52)
    annual_est = gross * periods

    paye = paye_for_period(gross, pay_frequency, tax_code)
    ks_emp = kiwisaver_employee(gross, kiwisaver_enrolled, kiwisaver_employee_rate)
    ks_er = kiwisaver_employer(gross, kiwisaver_enrolled, kiwisaver_employer_rate)
    esct = esct_for_period(ks_er, annual_est)
    sl = student_loan_for_period(gross, pay_frequency, student_loan)
    cs = round(max(0.0, child_support or 0.0), 2)
    other = round(max(0.0, other_deductions or 0.0), 2)

    total_deductions = round(paye + ks_emp + sl + cs + other, 2)
    net = round(gross - total_deductions, 2)
    employer_cost = round(gross + ks_er + esct, 2)

    warnings: List[str] = []
    if net < 0:
        warnings.append("Net pay is negative — check deductions and adjustments.")
    if kiwisaver_enrolled and kiwisaver_employee_rate not in NZ_KIWISAVER_EMPLOYEE_RATES:
        warnings.append("KiwiSaver rate outside standard options — defaulted to 3%.")
    if pay_frequency not in PAY_FREQUENCY_PERIODS:
        warnings.append(f"Unknown pay frequency '{pay_frequency}' — defaulted to weekly.")

    return {
        "jurisdiction": "NZ",
        "supported": True,
        "pay_frequency": pay_frequency,
        "tax_code": tax_code,
        "gross": {
            "ordinary": round(gross_ordinary, 2),
            "overtime": round(gross_overtime, 2),
            "other": round(gross_other, 2),
            "adjustments": round(adjustments, 2),
            "total": gross,
        },
        "deductions": {
            "paye": paye,
            "kiwisaver_employee": ks_emp,
            "student_loan": sl,
            "child_support": cs,
            "other": other,
            "total": total_deductions,
        },
        "employer": {
            "kiwisaver_employer": ks_er,
            "esct": esct,
            "total_cost": employer_cost,
        },
        "net_pay": net,
        "annual_gross_estimate": round(annual_est, 2),
        "warnings": warnings,
    }
