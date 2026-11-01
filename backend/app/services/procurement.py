from typing import Dict, List, Optional
from datetime import datetime
from .data_loader import DataLoader
from .day_ahead import DayAheadService
from .metrics import MetricsService
from ..models import (
    ProcurementHourPlan,
    ProcurementTotals,
    ProcurementSimulationResponse
)

# Normalized UK Winter Diurnal Electricity Demand Profile (ratio of peak hour)
UK_WINTER_DIURNAL_PROFILE = [
    0.58, 0.55, 0.53, 0.52, 0.53, 0.58,  # 00:00 - 05:00 (Night trough)
    0.72, 0.85, 0.88, 0.84, 0.81, 0.79,  # 06:00 - 11:00 (Morning ramp)
    0.78, 0.77, 0.76, 0.78, 0.88, 1.00,  # 12:00 - 17:00 (Late afternoon to peak)
    0.98, 0.92, 0.84, 0.76, 0.69, 0.62   # 18:00 - 23:00 (Evening unwind)
]

# Benchmark UK Imbalance Settlement Cash-out Price estimate (£/MWh)
ESTIMATED_IMBALANCE_PRICE_GBP_MWH = 115.0

class ProcurementService:
    def __init__(self, data_loader: Optional[DataLoader] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.day_ahead_service = DayAheadService(self.loader)
        self.metrics_service = MetricsService(self.loader)

    def simulate_procurement(
        self,
        delivery_date_str: str,
        gate_closure_hour: int = 11,
        baseline_peak_demand_mw: float = 38000.0,
        confidence_level: float = 0.90
    ) -> ProcurementSimulationResponse:
        """
        Calculates the required additional thermal procurement beyond forecasted wind,
        incorporating quantified forecast error buffers to shield the utility from
        costly day-ahead under-procurement and imbalance penalties.
        """
        # Fetch day-ahead forecast & actuals
        da_res = self.day_ahead_service.get_day_ahead_forecast(
            delivery_date_str, gate_closure_hour
        )

        # Retrieve empirical error quantiles to determine the risk buffer
        # At 90% confidence, buffer covers 90% of observed wind over-forecast (shortfall) errors
        accuracy_res = self.metrics_service.calculate_january_accuracy(gate_closure_hour)
        quantiles = accuracy_res.summary.error_quantiles

        # Map confidence level to empirical buffer
        if confidence_level >= 0.95:
            buffer_mw = max(0.0, quantiles.p95)
        elif confidence_level >= 0.90:
            buffer_mw = max(0.0, quantiles.p90)
        elif confidence_level >= 0.75:
            buffer_mw = max(0.0, quantiles.p75)
        else:
            buffer_mw = max(0.0, quantiles.p50)

        hourly_plans: List[ProcurementHourPlan] = []
        tot_demand = 0.0
        tot_wind_fc = 0.0
        tot_residual = 0.0
        tot_buffer = 0.0
        tot_thermal = 0.0
        tot_actual_wind = 0.0
        unhedged_shortfall_mwh = 0.0
        hedged_shortfall_mwh = 0.0

        for p in da_res.points:
            h = p.hour
            profile_factor = UK_WINTER_DIURNAL_PROFILE[h]
            consumer_demand = round(baseline_peak_demand_mw * profile_factor, 2)
            wind_fc = p.forecast_mw
            net_residual = round(max(0.0, consumer_demand - wind_fc), 2)
            
            # Dynamic buffer scaled by wind forecast magnitude (uncertainty is higher when wind is high)
            # Normalization scale: buffer proportional to forecast vs monthly mean
            scaled_buffer = round(buffer_mw * (0.6 + 0.4 * (wind_fc / 12000.0)), 2) if wind_fc > 0 else 0.0
            recommended_thermal = round(net_residual + scaled_buffer, 2)

            act_wind = p.actual_mw
            act_residual = None
            unhedged_shortfall = None
            hedged_shortfall = None

            if act_wind is not None:
                act_residual = round(max(0.0, consumer_demand - act_wind), 2)
                # If actual wind was less than forecast, utility faces a shortfall
                wind_deficit = max(0.0, wind_fc - act_wind)
                unhedged_shortfall = round(wind_deficit, 2)
                hedged_shortfall = round(max(0.0, wind_deficit - scaled_buffer), 2)

                tot_actual_wind += act_wind
                unhedged_shortfall_mwh += unhedged_shortfall
                hedged_shortfall_mwh += hedged_shortfall

            tot_demand += consumer_demand
            tot_wind_fc += wind_fc
            tot_residual += net_residual
            tot_buffer += scaled_buffer
            tot_thermal += recommended_thermal

            hourly_plans.append(ProcurementHourPlan(
                hour=h,
                start_time=p.start_time,
                consumer_demand_mw=consumer_demand,
                wind_forecast_mw=wind_fc,
                net_residual_demand_mw=net_residual,
                risk_buffer_mw=scaled_buffer,
                recommended_thermal_procurement_mw=recommended_thermal,
                actual_wind_mw=act_wind,
                actual_residual_demand_mw=act_residual,
                unhedged_wind_shortfall_mw=unhedged_shortfall,
                hedged_wind_shortfall_mw=hedged_shortfall
            ))

        reduction_pct = 0.0
        if unhedged_shortfall_mwh > 0:
            reduction_pct = round(
                ((unhedged_shortfall_mwh - hedged_shortfall_mwh) / unhedged_shortfall_mwh) * 100.0, 1
            )

        avoided_penalty = round(
            (unhedged_shortfall_mwh - hedged_shortfall_mwh) * ESTIMATED_IMBALANCE_PRICE_GBP_MWH, 2
        )

        totals = ProcurementTotals(
            total_consumer_demand_gwh=round(tot_demand / 1000.0, 2),
            total_wind_forecast_gwh=round(tot_wind_fc / 1000.0, 2),
            total_net_residual_gwh=round(tot_residual / 1000.0, 2),
            total_risk_buffer_gwh=round(tot_buffer / 1000.0, 2),
            total_thermal_procured_gwh=round(tot_thermal / 1000.0, 2),
            total_actual_wind_gwh=round(tot_actual_wind / 1000.0, 2) if tot_actual_wind > 0 else None,
            unhedged_energy_shortfall_mwh=round(unhedged_shortfall_mwh, 2),
            hedged_energy_shortfall_mwh=round(hedged_shortfall_mwh, 2),
            shortfall_reduction_pct=reduction_pct,
            estimated_imbalance_penalty_avoided_gbp=avoided_penalty
        )

        return ProcurementSimulationResponse(
            delivery_date=delivery_date_str,
            confidence_level=confidence_level,
            reserve_buffer_mw=round(buffer_mw, 2),
            hourly_plan=hourly_plans,
            totals=totals
        )
