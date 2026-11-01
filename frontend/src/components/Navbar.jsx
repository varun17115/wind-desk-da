import React from 'react';
import {
  Wind,
  LayoutDashboard,
  GitBranch,
  Target,
  Zap,
  Code2,
  Moon,
  Sun
} from 'lucide-react';

export default function Navbar({ activeTab, onSelectTab, theme, onToggleTheme }) {
  const navItems = [
    { id: 'day-ahead', label: 'Day-Ahead Desk', icon: LayoutDashboard },
    { id: 'evolution', label: 'Horizon Evolution', icon: GitBranch },
    { id: 'accuracy', label: 'Accuracy Lab', icon: Target },
    { id: 'procurement', label: 'Thermal Procurement', icon: Zap },
    { id: 'architecture', label: 'Tech Lead Review', icon: Code2 },
  ];

  return (
    <header className="navbar">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Wind size={24} />
        </div>
        <div className="brand-title-group">
          <h1>REint WindDesk</h1>
          <div className="brand-subtitle">UK Wholesale Day-Ahead Renewable Intelligence</div>
        </div>
        <div className="live-badge" title="Filtered for UK National Wind generation across January 2026">
          <span className="pulse-dot"></span>
          <span>Elexon BMRS • Jan 2026</span>
        </div>
      </div>

      <nav className="nav-tabs" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-tab-${item.id}`}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => onSelectTab(item.id)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="header-controls">
        <button
          id="theme-toggle-btn"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
