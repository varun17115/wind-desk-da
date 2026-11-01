from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from .data_loader import DataLoader
from ..models import (
    ForecastPoint,
    DayAheadSummary,
    DayAheadForecastResponse,
    HorizonRun,
    ForecastEvolutionResponse
)

class DayAheadService:
    def __init__(self, data_loader: Optional[DataLoader] = None):
        self.loader = data_loader or DataLoader.get_instance()

    def get_day_ahead_forecast(
        self,
        delivery_date_str: str,
        gate_closure_hour: int = 11
    ) -> DayAheadForecastResponse:
        """
        Retrieves the latest available forecast published prior to the Day-Ahead
        gate closure (default 11:00 GMT on D-1) for each hour of the delivery day,
        aligned with actual outturn generation.
        """
        delivery_dt = datetime.fromisoformat(f"{delivery_date_str}T00:00:00+00:00")
        decision_gate_dt = (delivery_dt - timedelta(days=1)).replace(
            hour=gate_closure_hour, minute=0, second=0, microsecond=0
        )
        gate_time_iso = decision_gate_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        points: List[ForecastPoint] = []
        forecast_vals: List[float] = []
        actual_vals: List[float] = []
        abs_errors: List[float] = []
        errors: List[float] = []

        # Iterate through the 24 hours of delivery day
        for hour in range(24):
            target_start_dt = delivery_dt.replace(hour=hour)
            target_start_iso = target_start_dt.strftime("%Y-%m-%dT%H:00:00Z")

            # Find latest forecast published on or before decision_gate_dt
            best_forecast: Optional[Dict[str, Any]] = None
            for f in self.loader.parsed_forecasts:
                if f["start_dt"] == target_start_dt and f["publish_dt"] <= decision_gate_dt:
                    best_forecast = f
                    break  # parsed_forecasts is already sorted reverse by publish_dt

            if best_forecast is None:
                # If no forecast exists strictly before gate, fallback to earliest available
                for f in reversed(self.loader.parsed_forecasts):
                    if f["start_dt"] == target_start_dt:
                        best_forecast = f
                        break

            fc_mw = round(best_forecast["generation"], 2) if best_forecast else 0.0
            pub_time = best_forecast["publish_time"] if best_forecast else gate_time_iso
            pub_dt = best_forecast["publish_dt"] if best_forecast else decision_gate_dt
            lead_time = round((target_start_dt - pub_dt).total_seconds() / 3600.0, 1)

            actual_mw = self.loader.get_actual_hourly(target_start_iso)
            actual_round = round(actual_mw, 2) if actual_mw is not None else None

            err_mw = None
            abs_err_mw = None
            pct_err = None

            if actual_round is not None:
                err_mw = round(fc_mw - actual_round, 2)
                abs_err_mw = round(abs(err_mw), 2)
                if actual_round > 0:
                    pct_err = round((abs_err_mw / actual_round) * 100.0, 2)
                
                forecast_vals.append(fc_mw)
                actual_vals.append(actual_round)
                errors.append(err_mw)
                abs_errors.append(abs_err_mw)

            points.append(ForecastPoint(
                start_time=target_start_iso,
                hour=hour,
                settlement_period=hour * 2 + 1,
                forecast_mw=fc_mw,
                actual_mw=actual_round,
                error_mw=err_mw,
                abs_error_mw=abs_err_mw,
                pct_error=pct_err,
                publish_time=pub_time,
                lead_time_hours=lead_time
            ))

        # Compute summary metrics for the day
        sample_count = len(errors)
        mae = round(sum(abs_errors) / sample_count, 2) if sample_count > 0 else 0.0
        mse = sum(e ** 2 for e in errors) / sample_count if sample_count > 0 else 0.0
        rmse = round(mse ** 0.5, 2)
        total_act = sum(actual_vals)
        wape = round((sum(abs_errors) / total_act) * 100.0, 2) if total_act > 0 else 0.0
        bias = round(sum(errors) / sample_count, 2) if sample_count > 0 else 0.0

        summary = DayAheadSummary(
            total_forecast_gwh=round(sum(forecast_vals) / 1000.0, 2),
            total_actual_gwh=round(total_act / 1000.0, 2),
            peak_forecast_mw=round(max(forecast_vals), 2) if forecast_vals else 0.0,
            peak_actual_mw=round(max(actual_vals), 2) if actual_vals else 0.0,
            mae_mw=mae,
            rmse_mw=rmse,
            wape_pct=wape,
            bias_mw=bias,
            sample_points=sample_count
        )

        return DayAheadForecastResponse(
            delivery_date=delivery_date_str,
            decision_gate_time=gate_time_iso,
            points=points,
            summary=summary
        )

    def get_forecast_evolution(self, delivery_date_str: str) -> ForecastEvolutionResponse:
        """
        Returns multiple forecast runs published at varying horizons leading up to delivery:
        - D-2 (48h ahead)
        - D-1 Morning 07:00 (24h ahead)
        - D-1 Gate Closure 11:00 (Day-Ahead decision cutoff)
        - D-1 Evening 17:00 (Intraday update)
        - D-0 Early Morning 04:00 (Near delivery update)
        """
        delivery_dt = datetime.fromisoformat(f"{delivery_date_str}T00:00:00+00:00")
        
        milestones = [
            ("D-2 (48h ahead)", (delivery_dt - timedelta(days=2)).replace(hour=12, minute=0, second=0)),
            ("D-1 Early (24h ahead)", (delivery_dt - timedelta(days=1)).replace(hour=7, minute=0, second=0)),
            ("D-1 DA Gate (11:00 GMT)", (delivery_dt - timedelta(days=1)).replace(hour=11, minute=0, second=0)),
            ("D-1 Evening (17:00 GMT)", (delivery_dt - timedelta(days=1)).replace(hour=17, minute=0, second=0)),
            ("D-0 Delivery Morning (04:00 GMT)", delivery_dt.replace(hour=4, minute=0, second=0))
        ]

        runs: List[HorizonRun] = []
        for label, cutoff_dt in milestones:
            run_points = []
            for hour in range(24):
                target_start_dt = delivery_dt.replace(hour=hour)
                target_start_iso = target_start_dt.strftime("%Y-%m-%dT%H:00:00Z")

                match: Optional[Dict[str, Any]] = None
                for f in self.loader.parsed_forecasts:
                    if f["start_dt"] == target_start_dt and f["publish_dt"] <= cutoff_dt:
                        match = f
                        break
                
                if match:
                    run_points.append({
                        "hour": hour,
                        "start_time": target_start_iso,
                        "forecast_mw": round(match["generation"], 2),
                        "publish_time": match["publish_time"]
                    })
            
            if run_points:
                lead_hrs = round((delivery_dt.replace(hour=12) - cutoff_dt).total_seconds() / 3600.0, 1)
                runs.append(HorizonRun(
                    publish_time=cutoff_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    label=label,
                    hours_before_delivery=lead_hrs,
                    points=run_points
                ))

        # Actuals for the day
        actuals = []
        for hour in range(24):
            target_start_iso = delivery_dt.replace(hour=hour).strftime("%Y-%m-%dT%H:00:00Z")
            act = self.loader.get_actual_hourly(target_start_iso)
            actuals.append({
                "hour": hour,
                "start_time": target_start_iso,
                "actual_mw": round(act, 2) if act is not None else None
            })

        return ForecastEvolutionResponse(
            delivery_date=delivery_date_str,
            runs=runs,
            actuals=actuals
        )
