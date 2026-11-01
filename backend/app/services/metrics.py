import math
from typing import Dict, List, Optional, Tuple, Any
from .data_loader import DataLoader
from .day_ahead import DayAheadService
from ..models import (
    DailyMetric,
    HistogramBin,
    DiurnalMetric,
    QuantileMetrics,
    OverallAccuracySummary,
    AccuracyMetricsResponse
)

class MetricsService:
    def __init__(self, data_loader: Optional[DataLoader] = None):
        self.loader = data_loader or DataLoader.get_instance()
        self.day_ahead_service = DayAheadService(self.loader)

    def calculate_january_accuracy(self, gate_closure_hour: int = 11) -> AccuracyMetricsResponse:
        """
        Calculates comprehensive quantitative accuracy metrics across all days
        of January 2026 based on the Day-Ahead gate closure time.
        """
        dates = [d for d in self.loader.get_available_dates() if d.startswith("2026-01")]
        
        all_errors: List[float] = []
        all_abs_errors: List[float] = []
        all_actuals: List[float] = []
        all_forecasts: List[float] = []
        
        # Diurnal tracker: hour -> list of (forecast, actual, error)
        diurnal_tracker: Dict[int, List[Tuple[float, float, float]]] = {h: [] for h in range(24)}
        daily_metrics: List[DailyMetric] = []

        for d_str in dates:
            da_res = self.day_ahead_service.get_day_ahead_forecast(d_str, gate_closure_hour)
            day_errors = []
            day_abs_errors = []
            day_actuals = []
            day_forecasts = []

            for p in da_res.points:
                if p.actual_mw is not None:
                    fc = p.forecast_mw
                    act = p.actual_mw
                    err = fc - act
                    abs_err = abs(err)

                    day_errors.append(err)
                    day_abs_errors.append(abs_err)
                    day_actuals.append(act)
                    day_forecasts.append(fc)

                    all_errors.append(err)
                    all_abs_errors.append(abs_err)
                    all_actuals.append(act)
                    all_forecasts.append(fc)

                    diurnal_tracker[p.hour].append((fc, act, err))

            cnt = len(day_errors)
            if cnt > 0:
                d_mae = round(sum(day_abs_errors) / cnt, 2)
                d_rmse = round((sum(e ** 2 for e in day_errors) / cnt) ** 0.5, 2)
                tot_act = sum(day_actuals)
                d_wape = round((sum(day_abs_errors) / tot_act) * 100.0, 2) if tot_act > 0 else 0.0
                d_bias = round(sum(day_errors) / cnt, 2)

                daily_metrics.append(DailyMetric(
                    date=d_str,
                    sample_count=cnt,
                    mae_mw=d_mae,
                    rmse_mw=d_rmse,
                    wape_pct=d_wape,
                    bias_mw=d_bias,
                    actual_gwh=round(tot_act / 1000.0, 2),
                    forecast_gwh=round(sum(day_forecasts) / 1000.0, 2),
                    peak_forecast_mw=round(max(day_forecasts), 2) if day_forecasts else 0.0,
                    peak_actual_mw=round(max(day_actuals), 2) if day_actuals else 0.0
                ))

        total_pts = len(all_errors)
        if total_pts == 0:
            raise ValueError("No matching forecast and actual data points found.")

        # Overall summary calculations
        overall_mae = round(sum(all_abs_errors) / total_pts, 2)
        overall_rmse = round((sum(e ** 2 for e in all_errors) / total_pts) ** 0.5, 2)
        tot_actual_all = sum(all_actuals)
        overall_wape = round((sum(all_abs_errors) / tot_actual_all) * 100.0, 2) if tot_actual_all > 0 else 0.0
        overall_bias = round(sum(all_errors) / total_pts, 2)
        max_over = round(max(all_errors), 2)
        max_under = round(min(all_errors), 2)

        # Quantile calculations
        sorted_errors = sorted(all_errors)
        def get_quantile(q: float) -> float:
            idx = int(q * (len(sorted_errors) - 1))
            return round(sorted_errors[idx], 2)

        quantiles = QuantileMetrics(
            p5=get_quantile(0.05),
            p10=get_quantile(0.10),
            p25=get_quantile(0.25),
            p50=get_quantile(0.50),
            p75=get_quantile(0.75),
            p90=get_quantile(0.90),
            p95=get_quantile(0.95)
        )

        overall_summary = OverallAccuracySummary(
            total_hours_evaluated=total_pts,
            total_forecast_gwh=round(sum(all_forecasts) / 1000.0, 2),
            total_actual_gwh=round(tot_actual_all / 1000.0, 2),
            overall_mae_mw=overall_mae,
            overall_rmse_mw=overall_rmse,
            overall_wape_pct=overall_wape,
            overall_bias_mw=overall_bias,
            max_over_forecast_mw=max_over,
            max_under_forecast_mw=max_under,
            error_quantiles=quantiles
        )

        # Diurnal breakdown
        diurnal_metrics: List[DiurnalMetric] = []
        for h in range(24):
            pts = diurnal_tracker[h]
            if pts:
                h_cnt = len(pts)
                h_fcs = [p[0] for p in pts]
                h_acts = [p[1] for p in pts]
                h_errs = [p[2] for p in pts]
                h_mae = sum(abs(e) for e in h_errs) / h_cnt
                h_rmse = (sum(e ** 2 for e in h_errs) / h_cnt) ** 0.5
                h_bias = sum(h_errs) / h_cnt

                diurnal_metrics.append(DiurnalMetric(
                    hour=h,
                    sample_count=h_cnt,
                    avg_forecast_mw=round(sum(h_fcs) / h_cnt, 2),
                    avg_actual_mw=round(sum(h_acts) / h_cnt, 2),
                    mae_mw=round(h_mae, 2),
                    rmse_mw=round(h_rmse, 2),
                    bias_mw=round(h_bias, 2)
                ))

        # Histogram calculation: -6000 to +6000 MW in 500 MW bins, plus outer buckets
        bin_width = 500.0
        min_bound = -6000.0
        max_bound = 6000.0
        num_bins = int((max_bound - min_bound) / bin_width)
        bin_counts = [0] * num_bins

        for err in all_errors:
            if err < min_bound:
                bin_counts[0] += 1
            elif err >= max_bound:
                bin_counts[-1] += 1
            else:
                b_idx = int((err - min_bound) / bin_width)
                b_idx = min(b_idx, num_bins - 1)
                bin_counts[b_idx] += 1

        histogram: List[HistogramBin] = []
        for i in range(num_bins):
            b_start = min_bound + i * bin_width
            b_end = b_start + bin_width
            b_center = (b_start + b_end) / 2.0
            cnt = bin_counts[i]
            pct = round((cnt / total_pts) * 100.0, 2)
            label = f"{int(b_start)} to {int(b_end)} MW"
            histogram.append(HistogramBin(
                bin_start=b_start,
                bin_end=b_end,
                bin_center=b_center,
                count=cnt,
                percentage=pct,
                label=label
            ))

        return AccuracyMetricsResponse(
            period="January 2026",
            summary=overall_summary,
            daily_metrics=daily_metrics,
            diurnal_metrics=diurnal_metrics,
            error_histogram=histogram
        )
