from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class DateListResponse(BaseModel):
    available_dates: List[str]
    default_date: str
    total_days: int

class ForecastPoint(BaseModel):
    start_time: str
    hour: int
    settlement_period: Optional[int] = None
    forecast_mw: float
    actual_mw: Optional[float] = None
    error_mw: Optional[float] = None  # Forecast - Actual
    abs_error_mw: Optional[float] = None
    pct_error: Optional[float] = None
    publish_time: str
    lead_time_hours: float

class DayAheadSummary(BaseModel):
    total_forecast_gwh: float
    total_actual_gwh: float
    peak_forecast_mw: float
    peak_actual_mw: float
    mae_mw: float
    rmse_mw: float
    wape_pct: float
    bias_mw: float
    sample_points: int

class DayAheadForecastResponse(BaseModel):
    delivery_date: str
    decision_gate_time: str
    points: List[ForecastPoint]
    summary: DayAheadSummary

class HorizonRun(BaseModel):
    publish_time: str
    label: str
    hours_before_delivery: float
    points: List[Dict[str, Any]]

class ForecastEvolutionResponse(BaseModel):
    delivery_date: str
    runs: List[HorizonRun]
    actuals: List[Dict[str, Any]]

class DailyMetric(BaseModel):
    date: str
    sample_count: int
    mae_mw: float
    rmse_mw: float
    wape_pct: float
    bias_mw: float
    actual_gwh: float
    forecast_gwh: float
    peak_forecast_mw: float
    peak_actual_mw: float

class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    bin_center: float
    count: int
    percentage: float
    label: str

class DiurnalMetric(BaseModel):
    hour: int
    sample_count: int
    avg_forecast_mw: float
    avg_actual_mw: float
    mae_mw: float
    rmse_mw: float
    bias_mw: float

class QuantileMetrics(BaseModel):
    p5: float
    p10: float
    p25: float
    p50: float  # median
    p75: float
    p90: float
    p95: float

class OverallAccuracySummary(BaseModel):
    total_hours_evaluated: int
    total_forecast_gwh: float
    total_actual_gwh: float
    overall_mae_mw: float
    overall_rmse_mw: float
    overall_wape_pct: float
    overall_bias_mw: float
    max_over_forecast_mw: float
    max_under_forecast_mw: float
    error_quantiles: QuantileMetrics

class AccuracyMetricsResponse(BaseModel):
    period: str
    summary: OverallAccuracySummary
    daily_metrics: List[DailyMetric]
    diurnal_metrics: List[DiurnalMetric]
    error_histogram: List[HistogramBin]

class ProcurementHourPlan(BaseModel):
    hour: int
    start_time: str
    consumer_demand_mw: float
    wind_forecast_mw: float
    net_residual_demand_mw: float
    risk_buffer_mw: float
    recommended_thermal_procurement_mw: float
    actual_wind_mw: Optional[float] = None
    actual_residual_demand_mw: Optional[float] = None
    unhedged_wind_shortfall_mw: Optional[float] = None
    hedged_wind_shortfall_mw: Optional[float] = None

class ProcurementTotals(BaseModel):
    total_consumer_demand_gwh: float
    total_wind_forecast_gwh: float
    total_net_residual_gwh: float
    total_risk_buffer_gwh: float
    total_thermal_procured_gwh: float
    total_actual_wind_gwh: Optional[float] = None
    unhedged_energy_shortfall_mwh: Optional[float] = None
    hedged_energy_shortfall_mwh: Optional[float] = None
    shortfall_reduction_pct: Optional[float] = None
    estimated_imbalance_penalty_avoided_gbp: Optional[float] = None

class ProcurementSimulationResponse(BaseModel):
    delivery_date: str
    confidence_level: float
    reserve_buffer_mw: float
    hourly_plan: List[ProcurementHourPlan]
    totals: ProcurementTotals
