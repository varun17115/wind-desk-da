import io
import csv
from fastapi import APIRouter, Query, HTTPException, Response
from ..services.data_loader import DataLoader
from ..services.day_ahead import DayAheadService
from ..services.metrics import MetricsService
from ..services.procurement import ProcurementService
from ..models import (
    DateListResponse,
    DayAheadForecastResponse,
    ForecastEvolutionResponse,
    AccuracyMetricsResponse,
    ProcurementSimulationResponse
)

router = APIRouter(prefix="/api", tags=["Energy Analytics"])

loader = DataLoader.get_instance()
day_ahead_service = DayAheadService(loader)
metrics_service = MetricsService(loader)
procurement_service = ProcurementService(loader)

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "UK Day-Ahead Wind & Procurement Analytics",
        "dataset": "Elexon BMRS January 2026",
        "dates_available": len(loader.get_available_dates()),
        "forecasts_loaded": len(loader.parsed_forecasts)
    }

@router.get("/dates", response_model=DateListResponse)
def get_available_dates():
    dates = loader.get_available_dates()
    if not dates:
        raise HTTPException(status_code=500, detail="No dates loaded in system.")
    default_date = "2026-01-15" if "2026-01-15" in dates else dates[0]
    return DateListResponse(
        available_dates=dates,
        default_date=default_date,
        total_days=len(dates)
    )

@router.get("/forecast/day-ahead", response_model=DayAheadForecastResponse)
def get_day_ahead_forecast(
    date: str = Query(..., description="Delivery date in format YYYY-MM-DD (e.g. 2026-01-15)"),
    gate_hour: int = Query(11, ge=0, le=23, description="Decision gate hour on D-1 in GMT (default 11)")
):
    dates = loader.get_available_dates()
    if date not in dates:
        raise HTTPException(
            status_code=404,
            detail=f"Date {date} not found. Available dates are: {dates[0]} to {dates[-1]}"
        )
    return day_ahead_service.get_day_ahead_forecast(date, gate_hour)

@router.get("/forecast/evolution", response_model=ForecastEvolutionResponse)
def get_forecast_evolution(
    date: str = Query(..., description="Delivery date in format YYYY-MM-DD (e.g. 2026-01-15)")
):
    dates = loader.get_available_dates()
    if date not in dates:
        raise HTTPException(
            status_code=404,
            detail=f"Date {date} not found."
        )
    return day_ahead_service.get_forecast_evolution(date)

@router.get("/analytics/accuracy", response_model=AccuracyMetricsResponse)
def get_accuracy_metrics(
    gate_hour: int = Query(11, ge=0, le=23, description="Decision gate hour on D-1 in GMT (default 11)")
):
    try:
        return metrics_service.calculate_january_accuracy(gate_hour)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/procurement/simulate", response_model=ProcurementSimulationResponse)
def simulate_procurement(
    date: str = Query(..., description="Delivery date YYYY-MM-DD"),
    gate_hour: int = Query(11, ge=0, le=23, description="Decision gate hour on D-1"),
    demand_peak: float = Query(38000.0, ge=1000.0, le=100000.0, description="Peak consumer demand in MW"),
    confidence: float = Query(0.90, ge=0.50, le=0.99, description="Risk hedging confidence quantile")
):
    dates = loader.get_available_dates()
    if date not in dates:
        raise HTTPException(status_code=404, detail=f"Date {date} not found.")
    return procurement_service.simulate_procurement(
        delivery_date_str=date,
        gate_closure_hour=gate_hour,
        baseline_peak_demand_mw=demand_peak,
        confidence_level=confidence
    )

@router.get("/export/csv")
def export_day_csv(
    date: str = Query(..., description="Delivery date YYYY-MM-DD"),
    gate_hour: int = Query(11, ge=0, le=23)
):
    res = day_ahead_service.get_day_ahead_forecast(date, gate_hour)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "DeliveryDate", "Hour", "StartTime", "SettlementPeriod",
        "ForecastMW", "ActualMW", "ErrorMW", "AbsErrorMW", "PctError", "PublishTime", "LeadTimeHours"
    ])
    for p in res.points:
        writer.writerow([
            res.delivery_date, p.hour, p.start_time, p.settlement_period,
            p.forecast_mw, p.actual_mw, p.error_mw, p.abs_error_mw, p.pct_error, p.publish_time, p.lead_time_hours
        ])
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=wind_dayahead_{date}.csv"}
    )
