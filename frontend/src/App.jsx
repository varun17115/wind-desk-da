import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DayAheadDesk from './components/DayAheadDesk';
import ForecastEvolution from './components/ForecastEvolution';
import AccuracyLab from './components/AccuracyLab';
import ProcurementSimulator from './components/ProcurementSimulator';
import ArchitectureReview from './components/ArchitectureReview';
import {
  fetchDates,
  fetchDayAheadForecast,
  fetchForecastEvolution,
  fetchAccuracyMetrics
} from './services/api';
import { Calendar, Clock, RotateCcw, AlertTriangle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('day-ahead');
  const [theme, setTheme] = useState('dark');

  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('2026-01-15');
  const [gateHour, setGateHour] = useState(11);

  // Data states
  const [dayAheadData, setDayAheadData] = useState(null);
  const [dayAheadLoading, setDayAheadLoading] = useState(true);

  const [evolutionData, setEvolutionData] = useState(null);
  const [evolutionLoading, setEvolutionLoading] = useState(false);

  const [accuracyData, setAccuracyData] = useState(null);
  const [accuracyLoading, setAccuracyLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState(null);

  // Initialize theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Fetch available dates on mount
  useEffect(() => {
    fetchDates()
      .then((res) => {
        setAvailableDates(res.available_dates);
        if (res.available_dates.includes('2026-01-15')) {
          setSelectedDate('2026-01-15');
        } else if (res.available_dates.length > 0) {
          setSelectedDate(res.available_dates[0]);
        }
      })
      .catch((err) => {
        console.error('Error fetching dates:', err);
        setErrorMsg('Unable to connect to backend service. Please ensure the API is running.');
      });
  }, []);

  // Fetch Day-Ahead forecast when date or gate changes
  useEffect(() => {
    if (!selectedDate) return;
    setDayAheadLoading(true);
    fetchDayAheadForecast(selectedDate, gateHour)
      .then((data) => {
        setDayAheadData(data);
        setDayAheadLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching day ahead:', err);
        setDayAheadLoading(false);
      });
  }, [selectedDate, gateHour]);

  // Fetch evolution data when tab is active or date changes
  useEffect(() => {
    if (activeTab === 'evolution' && selectedDate) {
      setEvolutionLoading(true);
      fetchForecastEvolution(selectedDate)
        .then((data) => {
          setEvolutionData(data);
          setEvolutionLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching evolution:', err);
          setEvolutionLoading(false);
        });
    }
  }, [activeTab, selectedDate]);

  // Fetch accuracy data when tab is active or gate changes
  useEffect(() => {
    if (activeTab === 'accuracy') {
      setAccuracyLoading(true);
      fetchAccuracyMetrics(gateHour)
        .then((data) => {
          setAccuracyData(data);
          setAccuracyLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching accuracy:', err);
          setAccuracyLoading(false);
        });
    }
  }, [activeTab, gateHour]);

  const keyQuickDates = ['2026-01-05', '2026-01-10', '2026-01-15', '2026-01-22', '2026-01-29'];

  return (
    <div className="app-container">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {errorMsg && (
        <div className="doc-callout" style={{ borderLeftColor: '#f43f5e', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e' }}>
          <AlertTriangle size={18} style={{ display: 'inline', marginRight: '0.4rem', verticalAlign: 'text-bottom' }} />
          <strong>System Notice: </strong> {errorMsg}
        </div>
      )}

      {/* Global Controls & Scenario Toolbar */}
      <div className="global-controls-bar">
        <div className="controls-left">
          {/* Date Selector */}
          <div className="control-item">
            <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={15} color="#06b6d4" />
              Delivery Day:
            </span>
            <select
              id="select-delivery-date"
              className="control-select"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} {d === '2026-01-15' ? '(Mid-Month Benchmark)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Date Shortcuts */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {keyQuickDates.map((kd) => (
              <button
                key={kd}
                id={`btn-date-${kd}`}
                className={`btn-secondary ${selectedDate === kd ? 'active' : ''}`}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.6rem',
                  borderColor: selectedDate === kd ? 'var(--accent-cyan)' : 'var(--border-color)',
                  color: selectedDate === kd ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                }}
                onClick={() => setSelectedDate(kd)}
              >
                Jan {kd.split('-')[2]}
              </button>
            ))}
          </div>
        </div>

        <div className="controls-right">
          {/* Gate Closure Time Selector */}
          <div className="control-item">
            <span className="control-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Clock size={15} color="#f59e0b" />
              D-1 Decision Gate Closure:
            </span>
            <select
              id="select-gate-hour"
              className="control-select"
              value={gateHour}
              onChange={(e) => setGateHour(Number(e.target.value))}
            >
              <option value={9}>09:00 GMT (EPEX SPOT DA Cutoff)</option>
              <option value={11}>11:00 GMT (Official N2EX Gate - Default)</option>
              <option value={12}>12:00 GMT (Noon Benchmark)</option>
              <option value={14}>14:00 GMT (Post-Auction Reconciliation)</option>
              <option value={17}>17:00 GMT (Intraday Gate 1)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <main id="main-content-region">
        {activeTab === 'day-ahead' && (
          <DayAheadDesk
            data={dayAheadData}
            selectedDate={selectedDate}
            gateHour={gateHour}
            loading={dayAheadLoading}
          />
        )}

        {activeTab === 'evolution' && (
          <ForecastEvolution
            data={evolutionData}
            selectedDate={selectedDate}
            loading={evolutionLoading}
          />
        )}

        {activeTab === 'accuracy' && (
          <AccuracyLab
            data={accuracyData}
            gateHour={gateHour}
            loading={accuracyLoading}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('day-ahead');
            }}
          />
        )}

        {activeTab === 'procurement' && (
          <ProcurementSimulator
            selectedDate={selectedDate}
            gateHour={gateHour}
          />
        )}

        {activeTab === 'architecture' && (
          <ArchitectureReview />
        )}
      </main>
    </div>
  );
}
