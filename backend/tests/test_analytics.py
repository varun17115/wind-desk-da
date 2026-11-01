import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.data_loader import DataLoader
from backend.app.services.day_ahead import DayAheadService
from backend.app.services.metrics import MetricsService
from backend.app.services.procurement import ProcurementService

client = TestClient(app)

def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["dates_available"] >= 30

def test_available_dates():
    response = client.get("/api/dates")
    assert response.status_code == 200
    data = response.json()
    assert "2026-01-15" in data["available_dates"]
    assert data["total_days"] >= 30

def test_day_ahead_forecast():
    response = client.get("/api/forecast/day-ahead?date=2026-01-15&gate_hour=11")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-15"
    assert len(data["points"]) == 24
    
    # Check that lead times and actuals are present
    p0 = data["points"][0]
    assert p0["hour"] == 0
    assert p0["forecast_mw"] > 0
    assert p0["actual_mw"] is not None
    assert p0["error_mw"] == round(p0["forecast_mw"] - p0["actual_mw"], 2)

    # Check summary metrics
    summary = data["summary"]
    assert summary["sample_points"] == 24
    assert summary["mae_mw"] > 0
    assert summary["rmse_mw"] >= summary["mae_mw"]  # Mathematically RMSE >= MAE
    assert summary["wape_pct"] > 0

def test_forecast_evolution():
    response = client.get("/api/forecast/evolution?date=2026-01-15")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-15"
    assert len(data["runs"]) >= 3
    assert len(data["actuals"]) == 24

def test_accuracy_metrics():
    response = client.get("/api/analytics/accuracy?gate_hour=11")
    assert response.status_code == 200
    data = response.json()
    assert data["period"] == "January 2026"
    
    summary = data["summary"]
    assert summary["total_hours_evaluated"] >= 700
    assert summary["overall_mae_mw"] > 0
    assert summary["overall_rmse_mw"] >= summary["overall_mae_mw"]
    
    # Check diurnal breakdown
    assert len(data["diurnal_metrics"]) == 24
    assert data["diurnal_metrics"][0]["hour"] == 0
    
    # Check histogram
    assert len(data["error_histogram"]) > 0
    total_pct = sum(b["percentage"] for b in data["error_histogram"])
    assert 98.0 <= total_pct <= 102.0

def test_procurement_simulation():
    response = client.get("/api/procurement/simulate?date=2026-01-15&gate_hour=11&demand_peak=38000&confidence=0.90")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-15"
    assert len(data["hourly_plan"]) == 24
    
    totals = data["totals"]
    assert totals["total_consumer_demand_gwh"] > 0
    assert totals["total_thermal_procured_gwh"] > 0
    assert totals["hedged_energy_shortfall_mwh"] <= totals["unhedged_energy_shortfall_mwh"]
    if totals["unhedged_energy_shortfall_mwh"] > 0:
        assert totals["shortfall_reduction_pct"] > 50.0

def test_export_csv():
    response = client.get("/api/export/csv?date=2026-01-15&gate_hour=11")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    lines = response.text.strip().split("\n")
    assert len(lines) == 25  # Header + 24 hours
