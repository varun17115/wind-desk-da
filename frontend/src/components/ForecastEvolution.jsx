import React, { useState } from 'react';
import { GitBranch, Clock, ArrowRight, Zap, Target } from 'lucide-react';

export default function ForecastEvolution({ data, selectedDate, loading }) {
  const [selectedRunIndex, setSelectedRunIndex] = useState(null);

  if (loading) {
    return (
      <div className="state-box">
        <div className="spinner"></div>
        <p>Calculating forecast evolution for {selectedDate}...</p>
      </div>
    );
  }

  if (!data || !data.runs || data.runs.length === 0) {
    return (
      <div className="state-box">
        <GitBranch size={32} color="#f59e0b" />
        <p>No multi-horizon forecast runs available for {selectedDate}.</p>
      </div>
    );
  }

  const { runs, actuals } = data;

  // Chart setup
  const chartWidth = 900;
  const chartHeight = 340;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 45;
  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;

  // Collect all values to find max
  let allVals = actuals.map(a => a.actual_mw || 0);
  runs.forEach(r => {
    r.points.forEach(p => allVals.push(p.forecast_mw || 0));
  });
  const maxVal = Math.max(...allVals, 1000) * 1.15;

  const getX = (idx) => padLeft + (idx / 23) * plotWidth;
  const getY = (val) => padTop + plotHeight - ((val || 0) / maxVal) * plotHeight;

  // Color palette for runs
  const runColors = ['#94a3b8', '#a855f7', '#06b6d4', '#f59e0b', '#3b82f6'];

  // Actuals path
  const actPoints = actuals.map((a, idx) => `${getX(idx)},${getY(a.actual_mw)}`);
  const actPath = `M ${actPoints.join(' L ')}`;

  // Compute MAE and WAPE for each run
  const runStats = runs.map((run) => {
    let absErrSum = 0;
    let actSum = 0;
    let count = 0;

    run.points.forEach((p, idx) => {
      const act = actuals[idx]?.actual_mw;
      if (act !== null && act !== undefined) {
        absErrSum += Math.abs(p.forecast_mw - act);
        actSum += act;
        count++;
      }
    });

    const mae = count > 0 ? Math.round(absErrSum / count) : 0;
    const wape = actSum > 0 ? ((absErrSum / actSum) * 100).toFixed(1) : 0;
    return { ...run, mae, wape };
  });

  return (
    <div id="forecast-evolution-view">
      {/* Intro Banner */}
      <div className="doc-callout">
        <strong>Forecast Horizon & Convergence Analysis: </strong>
        Comparing multi-horizon forecast publications from 48 hours ahead (D-2) down to 4 hours ahead of delivery against actual outturn. This reveals forecast stability, weather model updates, and gate closure accuracy.
      </div>

      {/* Evolution Chart Panel */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <GitBranch size={20} color="#a855f7" />
              Forecast Horizon Convergence vs Actual Outturn ({selectedDate})
            </h2>
            <div className="panel-subtitle">
              Visualizing how the wind forecast shifted across model runs leading into the delivery day
            </div>
          </div>
        </div>

        <div className="chart-container">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="svg-chart-svg">
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

            {/* X-axis ticks */}
            {[0, 3, 6, 9, 12, 15, 18, 21, 23].map((hr) => (
              <text
                key={hr}
                x={getX(hr)}
                y={chartHeight - 15}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
                fontFamily="var(--font-mono)"
              >
                {`${String(hr).padStart(2, '0')}:00`}
              </text>
            ))}

            {/* Horizon Runs Lines */}
            {runs.map((run, rIdx) => {
              const color = runColors[rIdx % runColors.length];
              const isSelected = selectedRunIndex === rIdx;
              const isDimmed = selectedRunIndex !== null && !isSelected;
              const pts = run.points.map((p, idx) => `${getX(idx)},${getY(p.forecast_mw)}`);
              const path = `M ${pts.join(' L ')}`;

              return (
                <g key={rIdx} opacity={isDimmed ? 0.2 : 1}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth={isSelected ? '3.5' : '2'}
                    strokeDasharray={rIdx === 0 ? '5 5' : 'none'}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Actual Outturn Line (Bold Emerald) */}
            <path
              d={actPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>

          {/* Legend with interactive highlight toggle */}
          <div className="chart-legend">
            {runs.map((run, rIdx) => {
              const color = runColors[rIdx % runColors.length];
              const isSelected = selectedRunIndex === rIdx;
              return (
                <div
                  key={rIdx}
                  className="legend-item"
                  onClick={() => setSelectedRunIndex(isSelected ? null : rIdx)}
                  style={{
                    cursor: 'pointer',
                    fontWeight: isSelected ? '700' : '500',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)'
                  }}
                >
                  <span
                    className="legend-line"
                    style={{
                      background: color,
                      height: isSelected ? '4px' : '3px'
                    }}
                  ></span>
                  <span>{run.label}</span>
                </div>
              );
            })}
            <div className="legend-item" style={{ fontWeight: '700', color: '#10b981' }}>
              <span className="legend-line" style={{ background: '#10b981', height: '4px' }}></span>
              <span>Actual Outturn (FUELHH)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Horizon Convergence & Error Audit Table */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <Target size={18} color="#a855f7" />
              Forecast Horizon Error Performance & Convergence Rate
            </h2>
            <div className="panel-subtitle">
              Quantifying how prediction error improves as gate closure and delivery approach
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Forecast Model Run</th>
                <th>Cutoff Timestamp (UTC)</th>
                <th>Lead Time Horizon</th>
                <th>Mean Absolute Error (MAE)</th>
                <th>WAPE (%)</th>
                <th>Status / Gate</th>
              </tr>
            </thead>
            <tbody>
              {runStats.map((r, idx) => {
                const color = runColors[idx % runColors.length];
                return (
                  <tr key={idx}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: color,
                          display: 'inline-block'
                        }}
                      ></span>
                      <span style={{ fontWeight: '600' }}>{r.label}</span>
                    </td>
                    <td className="mono-cell" style={{ color: 'var(--text-muted)' }}>
                      {r.publish_time}
                    </td>
                    <td className="mono-cell">
                      {r.hours_before_delivery} hours ahead
                    </td>
                    <td className="mono-cell" style={{ fontWeight: '700', color: '#f59e0b' }}>
                      {r.mae.toLocaleString()} MW
                    </td>
                    <td className="mono-cell" style={{ fontWeight: '600' }}>
                      {r.wape}%
                    </td>
                    <td>
                      {r.label.includes('Gate') ? (
                        <span className="badge-status success">Official DA Gate</span>
                      ) : r.hours_before_delivery > 24 ? (
                        <span className="badge-status warning">Preliminary</span>
                      ) : (
                        <span className="badge-status" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                          Near-Realtime
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
