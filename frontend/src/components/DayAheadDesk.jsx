import React, { useState } from 'react';
import MetricCard from './MetricCard';
import {
  Wind,
  Zap,
  TrendingUp,
  AlertCircle,
  Download,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { getExportCsvUrl } from '../services/api';

export default function DayAheadDesk({
  data,
  selectedDate,
  gateHour,
  loading
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  if (loading) {
    return (
      <div className="state-box">
        <div className="spinner"></div>
        <p>Loading Day-Ahead Forecast for {selectedDate}...</p>
      </div>
    );
  }

  if (!data || !data.points || data.points.length === 0) {
    return (
      <div className="state-box">
        <AlertCircle size={32} color="#f43f5e" />
        <p>No forecast data available for {selectedDate}.</p>
      </div>
    );
  }

  const { points, summary } = data;

  // Chart coordinate calculations (width 900, height 320)
  const chartWidth = 900;
  const chartHeight = 320;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  const maxVal = Math.max(
    ...points.map(p => Math.max(p.forecast_mw || 0, p.actual_mw || 0)),
    1000
  ) * 1.15;

  const getX = (idx) => padLeft + (idx / 23) * plotWidth;
  const getY = (val) => padTop + plotHeight - ((val || 0) / maxVal) * plotHeight;

  // Forecast path
  const fcPoints = points.map((p, idx) => `${getX(idx)},${getY(p.forecast_mw)}`);
  const fcPath = `M ${fcPoints.join(' L ')}`;
  const fcArea = `${fcPath} L ${getX(23)},${padTop + plotHeight} L ${getX(0)},${padTop + plotHeight} Z`;

  // Actuals path
  const actPoints = points.map((p, idx) => `${getX(idx)},${getY(p.actual_mw)}`);
  const actPath = `M ${actPoints.join(' L ')}`;

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : points[17] || points[0];

  return (
    <div id="day-ahead-desk-view">
      {/* KPI Cards Row */}
      <div className="metrics-grid">
        <MetricCard
          id="metric-peak-forecast"
          title="Peak Day-Ahead Wind"
          value={summary.peak_forecast_mw.toLocaleString()}
          unit="MW"
          accentColor="#06b6d4"
          icon={Wind}
          footnote={`Decision Gate: ${data.decision_gate_time.replace('T', ' ').replace('Z', ' GMT')}`}
        />
        <MetricCard
          id="metric-total-forecast-energy"
          title="Day Expected Wind"
          value={summary.total_forecast_gwh.toLocaleString()}
          unit="GWh"
          accentColor="#38bdf8"
          icon={Zap}
          footnote={`Actual Outturn: ${summary.total_actual_gwh.toLocaleString()} GWh`}
        />
        <MetricCard
          id="metric-day-mae"
          title="Day MAE (Error)"
          value={summary.mae_mw.toLocaleString()}
          unit="MW"
          accentColor="#f59e0b"
          icon={TrendingUp}
          footnote={`WAPE: ${summary.wape_pct}% of actuals`}
        />
        <MetricCard
          id="metric-day-bias"
          title="Forecast Bias (MFE)"
          value={`${summary.bias_mw > 0 ? '+' : ''}${summary.bias_mw.toLocaleString()}`}
          unit="MW"
          accentColor={summary.bias_mw > 0 ? '#f43f5e' : '#10b981'}
          icon={AlertCircle}
          footnote={summary.bias_mw > 0 ? 'Over-forecasting (Shortfall risk)' : 'Under-forecasting (Surplus wind)'}
        />
      </div>

      {/* Main Interactive Chart Panel */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <Wind size={20} color="#06b6d4" />
              Day-Ahead Wind Forecast vs Actual Generation Outturn
            </h2>
            <div className="panel-subtitle">
              Target Delivery: {data.delivery_date} • Published at or before D-1 {gateHour}:00 GMT Gate Closure
            </div>
          </div>
          <a
            id="download-csv-btn"
            href={getExportCsvUrl(selectedDate, gateHour)}
            className="btn-secondary"
            download
            title="Download hourly settlement data as CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </a>
        </div>

        {/* SVG Interactive Chart */}
        <div className="chart-container">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="svg-chart-svg"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yVal = padTop + plotHeight * (1 - ratio);
              const labelMw = Math.round(maxVal * ratio);
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={yVal}
                    x2={padLeft + plotWidth}
                    y2={yVal}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 10}
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

            {/* X-axis tick marks */}
            {points.map((p, idx) => {
              if (idx % 3 !== 0 && idx !== 23) return null;
              const xPos = getX(idx);
              return (
                <text
                  key={idx}
                  x={xPos}
                  y={chartHeight - 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94a3b8"
                  fontFamily="var(--font-mono)"
                >
                  {`${String(idx).padStart(2, '0')}:00`}
                </text>
              );
            })}

            {/* Shaded Forecast Area */}
            <path d={fcArea} fill="url(#forecastGrad)" />

            {/* Difference / Error bars */}
            {points.map((p, idx) => {
              const xPos = getX(idx);
              const yFc = getY(p.forecast_mw);
              const yAct = getY(p.actual_mw);
              const isOver = p.forecast_mw > p.actual_mw;
              return (
                <line
                  key={idx}
                  x1={xPos}
                  y1={yFc}
                  x2={xPos}
                  y2={yAct}
                  stroke={isOver ? 'rgba(244, 63, 94, 0.45)' : 'rgba(16, 185, 129, 0.45)'}
                  strokeWidth="3"
                />
              );
            })}

            {/* Day-Ahead Forecast Line (Cyan) */}
            <path
              d={fcPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Actual Outturn Line (Emerald Green) */}
            <path
              d={actPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Hover Target Overlay & Points */}
            {points.map((p, idx) => {
              const xPos = getX(idx);
              const isHovered = hoveredIndex === idx;
              return (
                <g
                  key={idx}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  style={{ cursor: 'pointer' }}
                >
                  <rect
                    x={xPos - plotWidth / 48}
                    y={padTop}
                    width={plotWidth / 24}
                    height={plotHeight}
                    fill="transparent"
                  />
                  {isHovered && (
                    <>
                      <line
                        x1={xPos}
                        y1={padTop}
                        x2={xPos}
                        y2={padTop + plotHeight}
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={xPos}
                        cy={getY(p.forecast_mw)}
                        r="6"
                        fill="#06b6d4"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      <circle
                        cx={xPos}
                        cy={getY(p.actual_mw)}
                        r="6"
                        fill="#10b981"
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Chart Legend */}
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#06b6d4' }}></span>
              <span>Day-Ahead Forecast (WINDFOR at 11:00 D-1)</span>
            </div>
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#10b981' }}></span>
              <span>Actual Generation Outturn (FUELHH)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#f43f5e' }}></span>
              <span>Over-Forecast (Thermal Shortfall)</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#10b981' }}></span>
              <span>Under-Forecast (Surplus Wind)</span>
            </div>
          </div>
        </div>

        {/* Hover Inspector Tooltip Bar */}
        {activePoint && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1.25rem',
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              border: '1px solid var(--border-color)',
            }}
          >
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>SELECTED INTERVAL</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '1.1rem' }}>
                {String(activePoint.hour).padStart(2, '0')}:00 - {String((activePoint.hour + 1) % 24).padStart(2, '0')}:00 GMT
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  (SP {activePoint.settlement_period} & {activePoint.settlement_period + 1})
                </span>
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>DAY-AHEAD FORECAST</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '1.1rem', color: '#06b6d4' }}>
                {activePoint.forecast_mw.toLocaleString()} MW
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>ACTUAL OUTTURN</span>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '1.1rem', color: '#10b981' }}>
                {activePoint.actual_mw !== null ? `${activePoint.actual_mw.toLocaleString()} MW` : 'N/A'}
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>ERROR / BIAS</span>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  color: (activePoint.error_mw || 0) > 0 ? '#f43f5e' : '#10b981',
                }}
              >
                {(activePoint.error_mw || 0) > 0 ? '+' : ''}
                {activePoint.error_mw?.toLocaleString()} MW ({activePoint.pct_error}%)
              </div>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>LEAD TIME</span>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={14} color="#94a3b8" />
                {activePoint.lead_time_hours} hrs ahead
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hourly Settlement Breakdown Table */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <Clock size={18} color="#06b6d4" />
              Settlement Period Audit Table ({data.delivery_date})
            </h2>
            <div className="panel-subtitle">
              Granular half-hourly settlement periods mapped to market hours with quantified forecast deviation
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table" id="settlement-breakdown-table">
            <thead>
              <tr>
                <th>Delivery Hour</th>
                <th>Target Time (UTC)</th>
                <th>Day-Ahead Forecast (MW)</th>
                <th>Outturn Actual (MW)</th>
                <th>Error (MW)</th>
                <th>Abs Error (%)</th>
                <th>Lead Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => {
                const isOver = (p.error_mw || 0) > 0;
                const absPct = p.pct_error || 0;
                let statusClass = 'success';
                let statusText = 'Accurate';
                if (absPct > 15) {
                  statusClass = 'danger';
                  statusText = isOver ? 'Shortfall Risk' : 'Surplus Wind';
                } else if (absPct > 8) {
                  statusClass = 'warning';
                  statusText = 'Moderate Dev';
                }

                return (
                  <tr key={p.hour}>
                    <td className="mono-cell font-bold">
                      {String(p.hour).padStart(2, '0')}:00 - {String((p.hour + 1) % 24).padStart(2, '0')}:00
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--text-muted)' }}>
                      {p.start_time}
                    </td>
                    <td className="mono-cell" style={{ color: '#06b6d4', fontWeight: '600' }}>
                      {p.forecast_mw.toLocaleString()}
                    </td>
                    <td className="mono-cell" style={{ color: '#10b981', fontWeight: '600' }}>
                      {p.actual_mw?.toLocaleString() ?? '—'}
                    </td>
                    <td
                      className="mono-cell"
                      style={{
                        color: isOver ? '#f43f5e' : '#10b981',
                        fontWeight: '600'
                      }}
                    >
                      {isOver ? '+' : ''}{p.error_mw?.toLocaleString() ?? '—'}
                    </td>
                    <td className="mono-cell">
                      {p.pct_error !== null ? `${p.pct_error}%` : '—'}
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--text-muted)' }}>
                      {p.lead_time_hours}h
                    </td>
                    <td>
                      <span className={`badge-status ${statusClass}`}>
                        {statusText}
                      </span>
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
