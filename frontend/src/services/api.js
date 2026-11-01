const API_BASE = '/api';

export async function fetchDates() {
  const res = await fetch(`${API_BASE}/dates`);
  if (!res.ok) throw new Error('Failed to load available dates');
  return res.json();
}

export async function fetchDayAheadForecast(date, gateHour = 11) {
  const res = await fetch(`${API_BASE}/forecast/day-ahead?date=${date}&gate_hour=${gateHour}`);
  if (!res.ok) throw new Error(`Failed to load forecast for ${date}`);
  return res.json();
}

export async function fetchForecastEvolution(date) {
  const res = await fetch(`${API_BASE}/forecast/evolution?date=${date}`);
  if (!res.ok) throw new Error(`Failed to load forecast evolution for ${date}`);
  return res.json();
}

export async function fetchAccuracyMetrics(gateHour = 11) {
  const res = await fetch(`${API_BASE}/analytics/accuracy?gate_hour=${gateHour}`);
  if (!res.ok) throw new Error('Failed to load accuracy metrics');
  return res.json();
}

export async function fetchProcurementSimulation(date, gateHour = 11, demandPeak = 38000, confidence = 0.90) {
  const res = await fetch(
    `${API_BASE}/procurement/simulate?date=${date}&gate_hour=${gateHour}&demand_peak=${demandPeak}&confidence=${confidence}`
  );
  if (!res.ok) throw new Error('Failed to run procurement simulation');
  return res.json();
}

export function getExportCsvUrl(date, gateHour = 11) {
  return `${API_BASE}/export/csv?date=${date}&gate_hour=${gateHour}`;
}
