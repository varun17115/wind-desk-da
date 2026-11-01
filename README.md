# UK Day-Ahead Renewable Analytics & Procurement Platform

> **REint Full-Stack Software Engineering Challenge (v4)**  
> Developed for UK Wholesale Electricity Day-Ahead Trading Desks & Energy Utilities.

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite)](https://vitejs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Multi--Stage-2496ED?logo=docker)](https://www.docker.com/)
[![Tests](https://img.shields.io/badge/pytest-Passing%20(7%2F7)-brightgreen)](backend/tests/)

---

## 1. Executive Summary & Problem Setting

In the UK wholesale electricity market, energy utilities must procure power on the Day-Ahead market (such as EPEX SPOT and Nord Pool / N2EX) one day prior to delivery ($D-1$) to satisfy their forecasted consumer demand. Because renewable wind generation is weather-dependent and volatile, power traders must accurately understand:
1. **Latest Available Wind Generation Forecasts**: The exact forecast data available strictly before the Day-Ahead decision gate closure time (typically 11:00 GMT on $D-1$).
2. **Quantitative Forecast Accuracy**: Empirical metrics (MAE, RMSE, WAPE, Bias, and error quantiles) evaluating forecast performance.
3. **Thermal Procurement Sizing**: How much additional dispatchable generation (e.g., thermal power plants) must be purchased beyond expected wind, incorporating empirical risk buffers to mitigate costly Elexon imbalance cash-out penalties.

This platform provides an end-to-end trading desk and analytical suite leveraging national-level wind actuals (`FUELHH`) and multi-horizon forecasts (`WINDFOR`) from Elexon BMRS for **January 2026**.

---

## 2. Live Application Deployment

- **Live Production URL**: [https://wind-desk-da.vercel.app](https://wind-desk-da.vercel.app)
- **API Health Check**: [https://wind-desk-da.vercel.app/api/health](https://wind-desk-da.vercel.app/api/health)
- **GitHub Repository**: [https://github.com/varun17115/wind-desk-da](https://github.com/varun17115/wind-desk-da)

---

## 3. Key Capabilities & Product Modules

### 1. Day-Ahead Trading Desk
- Point-in-time forecast selection: Filters all multi-horizon `WINDFOR` forecasts to guarantee **zero lookahead bias** by enforcing `publishTime <= Gate Closure Time` (configurable between 09:00, 11:00, 12:00, 14:00, and 17:00 GMT on $D-1$).
- Hour-by-hour alignment against Elexon `FUELHH` outturn actuals across all 24 market hours (48 settlement periods).
- Summary KPIs: Total Forecast vs. Actual (GWh), Peak Forecast vs. Actual (MW), MAE, RMSE, WAPE, and Systematic Bias.
- One-click CSV export of raw and calculated trading desk metrics.

### 2. Multi-Horizon Forecast Evolution
- Tracks forecast revisions leading into delivery: $D-2$ (48h ahead), $D-1$ Early (07:00 GMT), $D-1$ Day-Ahead Gate (11:00 GMT), $D-1$ Evening (17:00 GMT), and $D-0$ Delivery Morning (04:00 GMT).
- Allows traders to visualize forecast convergence and volatility toward actual outturn.

### 3. Quantitative Accuracy Lab
- Comprehensive statistical evaluation over all 744 hours of January 2026:
  - **MAE (Mean Absolute Error)**: Average deviation magnitude.
  - **RMSE (Root Mean Squared Error)**: Penalizes severe prediction misses.
  - **WAPE (Weighted Absolute Percentage Error)**: Division-by-zero resilient percentage metric.
  - **Systematic Bias**: Average directional over/under-forecasting.
  - **Empirical Quantiles**: $P_5$, $P_{10}$, $P_{25}$, $P_{50}$ (median), $P_{75}$, $P_{90}$, and $P_{95}$.
  - **Diurnal Error Distribution**: Hour-by-hour accuracy profile uncovering diurnal solar/wind patterns.
  - **Error Distribution Histogram**: 500 MW interval frequency binning.

### 4. Risk-Hedging Procurement Simulator
- Simulates a UK energy utility serving a representative winter consumer demand profile (peaking at ~38 GW).
- Quantifies net residual demand: $\text{Residual} = \max(0, \text{Demand} - \text{Wind Forecast})$.
- Sizes dynamic thermal procurement reserve buffers using empirical error quantiles ($P_{75}$, $P_{90}$, $P_{95}$).
- Computes unhedged vs. hedged energy shortfalls and avoided Elexon imbalance cash-out penalties (estimated at £115/MWh).

### 5. Tech Lead Review & Architecture Walkthrough
- Dedicated in-app interactive tab documenting the microservice blueprint, data flow pipeline, mathematical formulas, and testing strategy.

---

## 4. Directory & File Structure

```
grifbricks/
├── .gitignore                      # Git ignore rules for Python, Node, Vite, OS
├── Dockerfile                      # Multi-stage production container build (Node + Python)
├── docker-compose.yml              # Local containerized orchestration
├── Procfile                        # Heroku deployment process runner
├── vercel.json                     # Vercel serverless build and routing configuration
├── REint Full Stack SWE...docx     # Original challenge specification document
│
├── api/
│   └── index.py                    # Vercel Python WSGI/ASGI entrypoint forwarding to FastAPI
│
├── backend/
│   ├── requirements.txt            # Python dependencies (FastAPI, uvicorn, pydantic, numpy, pytest, httpx)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py               # Path resolutions, CORS settings, Elexon endpoints
│   │   ├── main.py                 # FastAPI application, middleware, static frontend mounting
│   │   ├── models.py               # Pydantic v2 schemas for all API requests and responses
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── routes.py           # REST endpoints (/dates, /forecast, /analytics, /procurement, /export)
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── data_loader.py      # Singleton data loader and in-memory dual-index caching engine
│   │       ├── day_ahead.py        # Day-Ahead point-in-time forecast selection & evolution
│   │       ├── metrics.py          # Statistical accuracy calculation (MAE, RMSE, WAPE, quantiles)
│   │       └── procurement.py      # Thermal procurement simulation & risk buffer calculator
│   │
│   ├── data/
│   │   ├── fuelhh_wind_jan2026.json # Elexon FUELHH actual wind generation (30-min resolution)
│   │   └── windfor_jan2026.json     # Elexon WINDFOR multi-horizon wind forecasts
│   │
│   ├── scripts/
│   │   ├── ingest_elexon.py        # Automated Elexon BMRS API data ingestion script
│   │   └── exploratory/            # Historical diagnostic and data exploration scripts
│   │
│   └── tests/
│       ├── __init__.py
│       └── test_analytics.py       # End-to-end integration and mathematical unit tests
│
└── frontend/
    ├── package.json                # Frontend dependencies (React 19, Lucide icons, Vite)
    ├── vite.config.js              # Vite configuration with API dev proxy
    ├── index.html                  # HTML5 SPA entry point
    ├── public/                     # Static assets (favicons, SVG badges)
    └── src/
        ├── main.jsx                # React root mount
        ├── App.jsx                 # Application layout, global state, date & gate controls
        ├── App.css                 # Component-specific styles
        ├── index.css               # Clean modern design system (dark/light themes)
        ├── services/
        │   └── api.js              # Centralized client API service methods
        └── components/
            ├── Navbar.jsx          # Header with navigation tabs and theme toggle
            ├── MetricCard.jsx      # Reusable KPI metric card with status indicators
            ├── DayAheadDesk.jsx    # Day-Ahead trading desk with interactive SVG charts & tables
            ├── ForecastEvolution.jsx # Multi-horizon forecast curve comparisons
            ├── AccuracyLab.jsx     # Quantitative error analytics, quantiles, and histograms
            ├── ProcurementSimulator.jsx # Demand vs. wind residual & risk hedging calculator
            └── ArchitectureReview.jsx # Tech lead review tab with system architecture & formulas
```

---

## 5. Getting Started & How to Run Locally

### Prerequisites
- **Python**: 3.11 or higher (Python 3.14 compatible)
- **Node.js**: v18+ or v20+ with npm
- **Docker** *(optional, for containerized run)*

---

### Option A: Running with Local Python & Vite (Recommended for Dev)

#### 1. Setup Backend
```bash
# From repository root
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server (starts on http://localhost:8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Setup Frontend
```bash
# In a separate terminal, navigate to frontend
cd frontend

# Install dependencies
npm install

# Start Vite dev server (starts on http://localhost:5173 with API proxy to port 8000)
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### Option B: Running with Docker / Docker Compose

A multi-stage `Dockerfile` packages the compiled React application and serves it directly through FastAPI:

```bash
# Build and run container
docker-compose up --build

# Or using raw Docker commands:
docker build -t reint-winddesk .
docker run -p 8000:8000 reint-winddesk
```
Open **`http://localhost:8000`** in your browser.

---

### Option C: Running Test Suite

Verify all unit and API integration tests:

```bash
# From repository root:
python -m pytest backend/tests -v
```

All 7 test suites validate:
- System health and loaded January 2026 data integrity
- Day-Ahead point-in-time gate closure filtering logic
- Statistical metric consistency ($\text{RMSE} \ge \text{MAE}$)
- Error quantiles ordering ($P_5 \le P_{50} \le P_{95}$)
- Procurement risk buffer scaling and shortfall hedging
- CSV export formatting and delivery

---

## 6. How to Deploy to Vercel or Heroku

### Deploy to Vercel (Recommended)
1. Install Vercel CLI: `npm install -g vercel`
2. Run `vercel login`
3. From the repository root, run:
   ```bash
   vercel --prod
   ```
4. Vercel automatically detects `vercel.json`, builds the frontend (`@vercel/static-build`), and provisions the backend serverless function (`@vercel/python` routing `/api/*` to `api/index.py`).

### Deploy to Heroku
1. Log in with the Heroku CLI: `heroku login`
2. Create an app: `heroku create your-anonymous-app-name`
3. Add Python buildpack: `heroku buildpacks:set heroku/python`
4. Deploy:
   ```bash
   git push heroku main
   ```
5. Heroku automatically launches `Procfile` using Uvicorn.

---

## 7. Video Demo Walkthrough Guide (Deliverable 3.1)

Per challenge requirements, record a 10-minute unlisted YouTube video structured in two parts:

### Part 1: Client Pitch (Max 5 Minutes)
- **Role**: Presenting the output of a pilot project to a UK energy utility trading team.
- **Key Talking Points**:
  1. *The Day-Ahead Challenge*: Why relying on raw forecasts causes expensive imbalance settlement penalties when wind drops unexpectedly.
  2. *Day-Ahead Desk Walkthrough*: Show the selected delivery day (e.g. Jan 15 or Jan 22), demonstrate how the system isolates forecasts available strictly before the 11:00 GMT decision gate, and compare forecast vs. actual outturn.
  3. *Forecast Evolution*: Show how forecast uncertainty narrows from $D-2$ through $D-0$.
  4. *Procurement Simulator*: Demonstrate how the quantified forecast error is translated into an actionable thermal procurement plan, hedging against wind deficits and saving estimated imbalance penalties.

### Part 2: Technical Lead Review & Knowledge Transfer (Max 5 Minutes)
- **Role**: Explaining architecture, engineering practices, and code design to an internal tech lead.
- **Key Talking Points** *(Use the in-app "Tech Review" tab)*:
  1. *Architecture Blueprint*: Fast decoupled architecture, in-memory dual indexing (`actuals_hourly` and reverse-sorted `parsed_forecasts`).
  2. *Point-in-Time Integrity*: Strict elimination of lookahead bias (`publishTime <= gate_hour`).
  3. *Statistical Formulation*: MAE, RMSE, WAPE, and empirical quantile calculation ($P_5$ to $P_{95}$).
  4. *Docker & Production Readiness*: Multi-stage container, automated test suite, and Vercel/Heroku portability.

---

## 8. AI Tools Disclosure

As explicitly permitted and required by the challenge guidelines:
- **AI Tools Used**: Google Antigravity / Gemini-assisted coding tools were utilized to accelerate boilerplate development, formulate initial statistical aggregations, and assist with UI component styling and documentation.
- All domain logic, gate closure constraints, Elexon BMRS ingestion, and procurement risk hedging algorithms were rigorously designed, verified, and tested against actual Elexon market data.

---

## 9. Submission Checklist

- [x] Full-stack application implemented (FastAPI backend + React frontend)
- [x] Elexon BMRS national wind actuals (`FUELHH`) and forecasts (`WINDFOR`) ingested for January 2026
- [x] Day-Ahead decision gate logic implemented (no lookahead bias)
- [x] Quantitative accuracy metrics (MAE, RMSE, WAPE, Bias, Quantiles, Diurnal)
- [x] Thermal procurement and risk buffer sizing modeled
- [x] Dockerfile and docker-compose configured
- [x] Comprehensive test suite passing (7/7 tests)
- [x] Project structure cleaned and documented
- [x] Live application deployed to Vercel and verified in incognito mode: https://wind-desk-da.vercel.app
- [x] Git repository initialized, committed, and pushed to public GitHub repository: https://github.com/varun17115/wind-desk-da
- [ ] 10-minute unlisted YouTube video recorded (Part 1 Client Pitch + Part 2 Tech Review)
- [ ] Submission form completed with all links tested in incognito mode

