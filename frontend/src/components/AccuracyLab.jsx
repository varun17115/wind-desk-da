import React, { useState } from 'react';
import MetricCard from './MetricCard';
import {
  Target,
  BarChart3,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  HelpCircle,
  Calendar
} from 'lucide-react';

export default function AccuracyLab({
  data,
  gateHour,
  loading,
  onSelectDate
}) {
  const [selectedDayMetric, setSelectedDayMetric] = useState(null);

  if (loading) {
    return (
      <div className="state-box">
        <div className="spinner"></div>
        <p>Calculating full January 2026 quantitative accuracy metrics...</p>
      </div>
    );
  }

  if (!data || !data.summary) {
    return (
      <div className="state-box">
        <Target size={32} color="#f43f5e" />
        <p>No accuracy analytics available.</p>
      </div>
    );
  }

  const { summary, daily_metrics, diurnal_metrics, error_histogram } = data;
  const q = summary.error_quantiles;

  // 1. Daily Trend Chart Dimensions
  const chartW = 900;
  const chartH = 260;
  const padL = 55;
  const padR = 25;
  const padT = 25;
  const padB = 45;
  const pW = chartW - padL - padR;
  const pH = chartH - padT - padB;

  const maxDailyMae = Math.max(...daily_metrics.map(d => d.mae_mw), 1000) * 1.15;
  const getDailyX = (idx) => padL + (idx / (daily_metrics.length - 1)) * pW;
  const getDailyY = (val) => padT + pH - (val / maxDailyMae) * pH;

  const dailyMaePoints = daily_metrics.map((d, idx) => `${getDailyX(idx)},${getDailyY(d.mae_mw)}`);
  const dailyMaePath = `M ${dailyMaePoints.join(' L ')}`;

  // 2. Diurnal Chart Dimensions
  const diurnalW = 420;
  const diurnalH = 220;
  const dPadL = 45;
  const dPadR = 15;
  const dPadT = 20;
  const dPadB = 35;
  const dpW = diurnalW - dPadL - dPadR;
  const dpH = diurnalH - dPadT - dPadB;

  const maxDiurnalMae = Math.max(...diurnal_metrics.map(d => d.mae_mw), 500) * 1.15;
  const getDiurnalX = (hr) => dPadL + (hr / 23) * dpW;
  const getDiurnalY = (val) => dPadT + dpH - (val / maxDiurnalMae) * dpH;

  const diurnalPoints = diurnal_metrics.map((d) => `${getDiurnalX(d.hour)},${getDiurnalY(d.mae_mw)}`);
  const diurnalPath = `M ${diurnalPoints.join(' L ')}`;

  // 3. Histogram Max Count
  const maxHistPct = Math.max(...error_histogram.map(b => b.percentage), 5) * 1.15;

  return (
    <div id="accuracy-lab-view">
      {/* Monthly KPI Overview */}
      <div className="metrics-grid">
        <MetricCard
          id="metric-overall-mae"
          title="Overall Month MAE"
          value={summary.overall_mae_mw.toLocaleString()}
          unit="MW"
          accentColor="#06b6d4"
          icon={Target}
          footnote={`Evaluated over ${summary.total_hours_evaluated} settlement hours`}
        />
        <MetricCard
          id="metric-overall-rmse"
          title="Root Mean Sq Error"
          value={summary.overall_rmse_mw.toLocaleString()}
          unit="MW"
          accentColor="#3b82f6"
          icon={Activity}
          footnote="Penalizes large extreme outlier swings"
        />
        <MetricCard
          id="metric-overall-wape"
          title="Weighted Error (WAPE)"
          value={`${summary.overall_wape_pct}%`}
          unit=""
          accentColor="#f59e0b"
          icon={BarChart3}
          footnote={`Actual Gen: ${summary.total_actual_gwh.toLocaleString()} GWh`}
        />
        <MetricCard
          id="metric-overall-bias"
          title="Systematic Bias (MFE)"
          value={`${summary.overall_bias_mw > 0 ? '+' : ''}${summary.overall_bias_mw.toLocaleString()}`}
          unit="MW"
          accentColor={summary.overall_bias_mw > 0 ? '#f43f5e' : '#10b981'}
          icon={TrendingUp}
          footnote={summary.overall_bias_mw > 0 ? 'Net Over-prediction tendency' : 'Net Under-prediction tendency'}
        />
        <MetricCard
          id="metric-p90-risk"
          title="P90 Risk Buffer"
          value={`+${q.p90.toLocaleString()}`}
          unit="MW"
          accentColor="#a855f7"
          icon={Layers}
          footnote="Covers 90% of empirical wind deficits"
        />
      </div>

      {/* Daily Error Trend Across January 2026 */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <Calendar size={18} color="#06b6d4" />
              Daily Forecast Error Trend across January 2026 (Day-Ahead Gate {gateHour}:00 GMT)
            </h2>
            <div className="panel-subtitle">
              Daily Mean Absolute Error (MW) for all 31 days. Hover or click to inspect and load day details.
            </div>
          </div>
        </div>

        <div className="chart-container">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="svg-chart-svg">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const yVal = padT + pH * (1 - ratio);
              const labelMw = Math.round(maxDailyMae * ratio);
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

            {/* X-axis dates */}
            {daily_metrics.map((d, idx) => {
              if (idx % 3 !== 0 && idx !== daily_metrics.length - 1) return null;
              const xPos = getDailyX(idx);
              const dayNum = d.date.split('-')[2];
              return (
                <text
                  key={idx}
                  x={xPos}
                  y={chartH - 15}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#94a3b8"
                  fontFamily="var(--font-mono)"
                >
                  {`Jan ${dayNum}`}
                </text>
              );
            })}

            {/* Daily Bars */}
            {daily_metrics.map((d, idx) => {
              const xPos = getDailyX(idx);
              const yVal = getDailyY(d.mae_mw);
              const barH = padT + pH - yVal;
              const isSelected = selectedDayMetric?.date === d.date;
              return (
                <rect
                  key={idx}
                  x={xPos - pW / (daily_metrics.length * 2.5)}
                  y={yVal}
                  width={pW / (daily_metrics.length * 1.5)}
                  height={barH}
                  fill={isSelected ? '#38bdf8' : 'rgba(6, 182, 212, 0.45)'}
                  rx="3"
                  cursor="pointer"
                  onMouseEnter={() => setSelectedDayMetric(d)}
                  onClick={() => onSelectDate && onSelectDate(d.date)}
                />
              );
            })}

            {/* Trend line */}
            <path
              d={dailyMaePath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
          </svg>

          {/* Day details tooltip */}
          {selectedDayMetric && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                border: '1px solid var(--border-glow)'
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>SELECTED DATE</span>
                <div style={{ fontWeight: '700', fontSize: '1rem' }}>{selectedDayMetric.date}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>DAY MAE</span>
                <div style={{ fontWeight: '700', color: '#06b6d4' }}>{selectedDayMetric.mae_mw.toLocaleString()} MW</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>WAPE</span>
                <div style={{ fontWeight: '700', color: '#f59e0b' }}>{selectedDayMetric.wape_pct}%</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>NET BIAS</span>
                <div style={{ fontWeight: '700', color: selectedDayMetric.bias_mw > 0 ? '#f43f5e' : '#10b981' }}>
                  {selectedDayMetric.bias_mw > 0 ? '+' : ''}{selectedDayMetric.bias_mw.toLocaleString()} MW
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => onSelectDate && onSelectDate(selectedDayMetric.date)}
              >
                Inspect in Trading Desk →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Two Column Grid: Diurnal Profile & Error Distribution */}
      <div className="grid-2col">
        {/* Diurnal Error Profile */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div className="panel-title-group">
              <h2>
                <Activity size={18} color="#06b6d4" />
                Diurnal Error Profile (by Settlement Hour)
              </h2>
              <div className="panel-subtitle">
                Average forecast error (MAE) across the 24 hours of the day
              </div>
            </div>
          </div>

          <svg viewBox={`0 0 ${diurnalW} ${diurnalH}`} className="svg-chart-svg">
            {[0, 0.5, 1].map((ratio, i) => {
              const yVal = dPadT + dpH * (1 - ratio);
              return (
                <g key={i}>
                  <line
                    x1={dPadL}
                    y1={yVal}
                    x2={dPadL + dpW}
                    y2={yVal}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={dPadL - 8}
                    y={yVal + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#64748b"
                    fontFamily="var(--font-mono)"
                  >
                    {Math.round(maxDiurnalMae * ratio).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {[0, 6, 12, 18, 23].map((hr) => (
              <text
                key={hr}
                x={getDiurnalX(hr)}
                y={diurnalH - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#94a3b8"
                fontFamily="var(--font-mono)"
              >
                {`${String(hr).padStart(2, '0')}:00`}
              </text>
            ))}

            <path
              d={diurnalPath}
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
            {diurnal_metrics.map((d) => (
              <circle
                key={d.hour}
                cx={getDiurnalX(d.hour)}
                cy={getDiurnalY(d.mae_mw)}
                r="3"
                fill="#06b6d4"
              />
            ))}
          </svg>
        </div>

        {/* Error Histogram / Distribution */}
        <div className="card-panel">
          <div className="card-panel-header">
            <div className="panel-title-group">
              <h2>
                <BarChart3 size={18} color="#a855f7" />
                Error Distribution Histogram
              </h2>
              <div className="panel-subtitle">
                Frequency distribution of forecast errors (MW) in January 2026
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '190px', overflowY: 'auto' }}>
            {error_histogram
              .filter(b => b.count > 0)
              .map((b, idx) => {
                const isOver = b.bin_center > 0;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                    <span style={{ width: '135px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {b.label}
                    </span>
                    <div style={{ flex: 1, background: 'var(--bg-input)', height: '14px', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(b.percentage / maxHistPct) * 100}%`,
                          height: '100%',
                          background: isOver ? '#f43f5e' : '#10b981',
                          borderRadius: '3px'
                        }}
                      ></div>
                    </div>
                    <span style={{ width: '45px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                      {b.percentage}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Quantiles & Value-at-Risk Table */}
      <div className="card-panel">
        <div className="card-panel-header">
          <div className="panel-title-group">
            <h2>
              <Layers size={18} color="#f59e0b" />
              Empirical Forecast Error Quantiles & Value-at-Risk (VaR)
            </h2>
            <div className="panel-subtitle">
              Used by utility risk managers to calibrate reserve power purchase margins and mitigate imbalance exposure
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quantile</th>
                <th>Percentile</th>
                <th>Error Value (MW)</th>
                <th>Market Significance</th>
                <th>Risk Policy Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="mono-cell font-bold">P5</td>
                <td className="mono-cell">5th percentile</td>
                <td className="mono-cell" style={{ color: '#10b981', fontWeight: '700' }}>{q.p5.toLocaleString()} MW</td>
                <td>Extreme wind surge (Actual &gt;&gt; Forecast)</td>
                <td>Spill / System Sell opportunity</td>
              </tr>
              <tr>
                <td className="mono-cell font-bold">P10</td>
                <td className="mono-cell">10th percentile</td>
                <td className="mono-cell" style={{ color: '#10b981', fontWeight: '700' }}>{q.p10.toLocaleString()} MW</td>
                <td>Significant surplus wind generation</td>
                <td>Reduce thermal generation ramp</td>
              </tr>
              <tr>
                <td className="mono-cell font-bold">P50 (Median)</td>
                <td className="mono-cell">50th percentile</td>
                <td className="mono-cell" style={{ color: '#38bdf8', fontWeight: '700' }}>{q.p50.toLocaleString()} MW</td>
                <td>Central tendency / Median expectation</td>
                <td>Unbiased base procurement baseline</td>
              </tr>
              <tr>
                <td className="mono-cell font-bold">P90</td>
                <td className="mono-cell">90th percentile</td>
                <td className="mono-cell" style={{ color: '#f59e0b', fontWeight: '700' }}>+{q.p90.toLocaleString()} MW</td>
                <td>High wind deficit shortfall (90% confidence)</td>
                <td>Recommended day-ahead reserve buffer</td>
              </tr>
              <tr>
                <td className="mono-cell font-bold">P95</td>
                <td className="mono-cell">95th percentile</td>
                <td className="mono-cell" style={{ color: '#f43f5e', fontWeight: '700' }}>+{q.p95.toLocaleString()} MW</td>
                <td>Worst-case winter wind drop (95% confidence)</td>
                <td>Ultra-conservative peaking asset standby</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
