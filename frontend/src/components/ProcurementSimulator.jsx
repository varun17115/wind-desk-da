import React, { useState, useEffect } from 'react';
import MetricCard from './MetricCard';
import {
  Zap,
  ShieldCheck,
  Flame,
  TrendingUp,
  AlertTriangle,
  Sliders,
  DollarSign,
  Info
} from 'lucide-react';
import { fetchProcurementSimulation } from '../services/api';

export default function ProcurementSimulator({
  selectedDate,
  gateHour
}) {
  const [demandPeak, setDemandPeak] = useState(38000);
  const [confidence, setConfidence] = useState(0.90);
  const [simData, setSimData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchProcurementSimulation(selectedDate, gateHour, demandPeak, confidence)
      .then((data) => {
        if (isMounted) {
          setSimData(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [selectedDate, gateHour, demandPeak, confidence]);

  if (loading && !simData) {
    return (
      <div className="state-box">
        <div className="spinner"></div>
        <p>Running Day-Ahead Thermal Procurement Sizing Simulation...</p>
      </div>
    );
  }

  if (error || !simData) {
    return (
      <div className="state-box">
        <AlertTriangle size={32} color="#f43f5e" />
        <p>Simulation error: {error || 'No data returned'}</p>
      </div>
    );
  }

  const { hourly_plan, totals, reserve_buffer_mw } = simData;

  // Chart Dimensions
  const chartW = 900;
  const chartH = 340;
  const padL = 60;
  const padR = 30;
  const padT = 30;
  const padB = 45;
  const pW = chartW - padL - padR;
  const pH = chartH - padT - padB;

  const maxVal = Math.max(
    ...hourly_plan.map(h => Math.max(h.consumer_demand_mw, h.recommended_thermal_procurement_mw)),
    1000
  ) * 1.15;

  const getX = (idx) => padL + (idx / 23) * pW;
  const getY = (val) => padT + pH - ((val || 0) / maxVal) * pH;

  const demandPath = `M ${hourly_plan.map((h, i) => `${getX(i)},${getY(h.consumer_demand_mw)}`).join(' L ')}`;
  const windPath = `M ${hourly_plan.map((h, i) => `${getX(i)},${getY(h.wind_forecast_mw)}`).join(' L ')}`;
  const thermalPath = `M ${hourly_plan.map((h, i) => `${getX(i)},${getY(h.recommended_thermal_procurement_mw)}`).join(' L ')}`;
  const actualResPath = `M ${hourly_plan.map((h, i) => `${getX(i)},${getY(h.actual_residual_demand_mw)}`).join(' L ')}`;

  // Shaded Thermal Area
  const thermalArea = `${thermalPath} L ${getX(23)},${padT + pH} L ${getX(0)},${padT + pH} Z`;

  return (
    <div id="procurement-simulator-view">
      {/* Intro Banner */}
      <div className="doc-callout">
        <strong>Thermal Procurement & Imbalance Risk Engine: </strong>
        Calculates the exact volume of additional thermal generation to procure in the Day-Ahead market beyond forecasted wind. Incorporates empirical forecast error quantiles to protect the utility from costly cash-out imbalance penalties.
      </div>

      {/* Simulator Control Sliders Bar */}
      <div className="card-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
          {/* Peak Demand Slider */}
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={14} color="#f59e0b" />
                Peak Consumer Demand:
              </span>
              <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {(demandPeak / 1000).toFixed(1)} GW ({demandPeak.toLocaleString()} MW)
              </strong>
            </div>
            <input
              type="range"
              min="15000"
              max="55000"
              step="1000"
              value={demandPeak}
              onChange={(e) => setDemandPeak(Number(e.target.value))}
              className="custom-range"
              id="slider-peak-demand"
            />
          </div>

          {/* Risk Hedging Confidence Slider */}
          <div className="slider-group">
            <div className="slider-label-row">
              <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} color="#10b981" />
                Risk Hedging Confidence:
              </span>
              <strong style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                {Math.round(confidence * 100)}% (P{Math.round(confidence * 100)} Buffer: +{reserve_buffer_mw.toLocaleString()} MW)
              </strong>
            </div>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="custom-range"
              id="slider-risk-confidence"
            />
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn-secondary ${confidence === 0.5 ? 'active' : ''}`}
              onClick={() => setConfidence(0.5)}
              title="Point forecast only (Zero risk buffer)"
            >
              P50 (Unhedged)
            </button>
            <button
              className={`btn-secondary ${confidence === 0.9 ? 'active' : ''}`}
              onClick={() => setConfidence(0.9)}
              title="Recommended commercial balance"
            >
              P90 (Recommended)
            </button>
            <button
              className={`btn-secondary ${confidence === 0.95 ? 'active' : ''}`}
              onClick={() => setConfidence(0.95)}
              title="Maximum security"
            >
              P95 (Robust)
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="metrics-grid">
        <MetricCard
          id="metric-total-consumer-demand"
          title="Total Consumer Demand"
          value={totals.total_consumer_demand_gwh.toLocaleString()}
          unit="GWh"
          accentColor="#94a3b8"
          icon={Zap}
          footnote="UK winter profile volume"
        />
        <MetricCard
          id="metric-net-residual-demand"
          title="Net Residual Demand"
          value={totals.total_net_residual_gwh.toLocaleString()}
          unit="GWh"
          accentColor="#f59e0b"
          icon={Flame}
          footnote="Demand minus point wind forecast"
        />
        <MetricCard
          id="metric-thermal-procured"
          title="Recommended Thermal"
          value={totals.total_thermal_procured_gwh.toLocaleString()}
          unit="GWh"
          accentColor="#fbbf24"
          icon={TrendingUp}
          footnote={`Includes +${totals.total_risk_buffer_gwh.toLocaleString()} GWh error buffer`}
        />
        <MetricCard
          id="metric-shortfall-reduction"
          title="Shortfall Risk Eliminated"
          value={`${totals.shortfall_reduction_pct || 0}%`}
          unit=""
          accentColor="#10b981"
          icon={ShieldCheck}
          footnote={`Hedged deficit: ${totals.hedged_energy_shortfall_mwh?.toLocaleString()} MWh`}
        />
        <MetricCard
          id="metric-penalty-avoided"
          title="Avoided Imbalance Risk"
          value={`£${((totals.estimated_imbalance_penalty_avoided_gbp || 0) / 1000).toFixed(0)}k`}
          unit=""
          accentColor="#38bdf8"
          icon={DollarSign}
          footnote="At estimated £115/MWh cash-out"
        />
      </div>

      {/* Main Procurement Simulation Chart */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <Flame size={20} color="#f59e0b" />
              Day-Ahead Net Residual Demand & Thermal Procurement Schedule
            </h2>
            <div className="panel-subtitle">
              Comparing consumer demand curve, expected wind contribution, and risk-adjusted thermal procurement orders
            </div>
          </div>
        </div>

        <div className="chart-container">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="svg-chart-svg">
            <defs>
              <linearGradient id="thermalGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yVal = padT + pH * (1 - ratio);
              const labelMw = Math.round(maxVal * ratio);
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    y1={yVal}
                    x2={padL + pW}
                    y2={yVal}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padL - 10}
                    y={yVal + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#64748b"
                    fontFamily="var(--font-mono)"
                  >
                    {labelMw.toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* X-axis ticks */}
            {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hr) => (
              <text
                key={hr}
                x={getX(hr)}
                y={chartH - 15}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
                fontFamily="var(--font-mono)"
              >
                {`${String(hr).padStart(2, '0')}:00`}
              </text>
            ))}

            {/* Shaded Thermal Area */}
            <path d={thermalArea} fill="url(#thermalGrad)" />

            {/* Consumer Demand Curve (White / Grey dashed) */}
            <path
              d={demandPath}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Forecasted Wind (Cyan) */}
            <path
              d={windPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />

            {/* Recommended Thermal Procurement with Buffer (Orange/Amber) */}
            <path
              d={thermalPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3.5"
            />

            {/* Actual Residual Demand (Emerald Green: True Outturn Need) */}
            <path
              d={actualResPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="2 2"
            />
          </svg>

          {/* Chart Legend */}
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#e2e8f0', borderTop: '1px dashed' }}></span>
              <span>Consumer Demand (Gross)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#06b6d4' }}></span>
              <span>Day-Ahead Wind Forecast</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#f59e0b', height: '4px' }}></span>
              <span>Recommended Thermal Purchase (with Risk Buffer)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#10b981' }}></span>
              <span>Actual Outturn Residual Demand</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hourly Thermal Purchase Schedule Table */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <DollarSign size={18} color="#10b981" />
              Day-Ahead Thermal Generation Purchase Orders ({selectedDate})
            </h2>
            <div className="panel-subtitle">
              Hour-by-hour commercial power purchase volumes to submit into the wholesale day-ahead market
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hour</th>
                <th>Consumer Demand (MW)</th>
                <th>Wind Forecast (MW)</th>
                <th>Net Residual Need (MW)</th>
                <th>Risk Buffer (MW)</th>
                <th>Recommended Thermal Order (MW)</th>
                <th>Actual Outturn Need (MW)</th>
                <th>Protection Outcome</th>
              </tr>
            </thead>
            <tbody>
              {hourly_plan.map((h) => {
                const wasCovered = (h.hedged_wind_shortfall_mw || 0) === 0;
                return (
                  <tr key={h.hour}>
                    <td className="mono-cell font-bold">
                      {String(h.hour).padStart(2, '0')}:00 - {String((h.hour + 1) % 24).padStart(2, '0')}:00
                    </td>
                    <td className="mono-cell">
                      {h.consumer_demand_mw.toLocaleString()}
                    </td>
                    <td className="mono-cell" style={{ color: '#06b6d4' }}>
                      {h.wind_forecast_mw.toLocaleString()}
                    </td>
                    <td className="mono-cell" style={{ color: '#f59e0b' }}>
                      {h.net_residual_demand_mw.toLocaleString()}
                    </td>
                    <td className="mono-cell" style={{ color: '#a855f7' }}>
                      +{h.risk_buffer_mw.toLocaleString()}
                    </td>
                    <td className="mono-cell font-bold" style={{ color: '#f59e0b', fontSize: '0.85rem' }}>
                      {h.recommended_thermal_procurement_mw.toLocaleString()} MW
                    </td>
                    <td className="mono-cell" style={{ color: '#10b981' }}>
                      {h.actual_residual_demand_mw?.toLocaleString() ?? '—'}
                    </td>
                    <td>
                      {wasCovered ? (
                        <span className="badge-status success">Fully Protected</span>
                      ) : (
                        <span className="badge-status warning">
                          Residual Deficit: {h.hedged_wind_shortfall_mw} MW
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
