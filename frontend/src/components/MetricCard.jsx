import React from 'react';

export default function MetricCard({
  title,
  value,
  unit = '',
  accentColor = '#06b6d4',
  icon: Icon,
  footnote,
  id
}) {
  return (
    <div
      id={id}
      className="metric-card"
      style={{ '--card-accent': accentColor }}
    >
      <div className="metric-header">
        <span className="metric-title">{title}</span>
        {Icon && (
          <div className="metric-icon-box" style={{ color: accentColor }}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="metric-value-group">
        <span className="metric-value">{value}</span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      {footnote && (
        <div className="metric-footnote">
          <span>{footnote}</span>
        </div>
      )}
    </div>
  );
}
