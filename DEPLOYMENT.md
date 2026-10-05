# Orbital Twin — Packaging & Deployment Guide

This document describes the prerequisites, installation steps, operation, configuration, testing, and deployment options for the **Orbital Twin Spacecraft Digital Twin** platform.

---

## 1. System Requirements & Prerequisites

| Component | Minimum Version | Recommended | Notes |
| :--- | :--- | :--- | :--- |
| **Python** | 3.12+ | 3.12.x | Required for backend physics and simulation engine |
| **Node.js** | 18.0.0+ | 20.x or 24.x | Required for React 19 / Vite UI |
| **npm** | 9.0.0+ | Latest | Bundled with Node.js |
| **Operating System** | Windows 10/11, macOS 13+, Ubuntu 22.04+ | Any 64-bit OS | Cross-platform |
| **GPU / WebGL** | WebGL 2.0 compatible | Dedicated or integrated modern GPU | For Three.js 3D Digital Twin rendering |

---

## 2. Environment Variables

Orbital Twin runs with zero required external cloud dependencies out-of-the-box. The following optional environment variables can be configured:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | FastAPI HTTP/WebSocket port |
| `HOST` | `0.0.0.0` | FastAPI network binding interface |
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL consumed by Vite frontend |
| `VITE_WS_URL` | `ws://localhost:8000` | WebSocket endpoint URL consumed by Vite frontend |
| `SIMULATION_RANDOM_SEED` | `42` | Deterministic random seed for physics engine reproducibility |

---

## 3. Installation

Clone or unpack the workspace into your chosen directory:

```bash
git clone <repository-url>
cd Orbital_Twin_Antigravity_Documentation
```

### 3.1 Backend Dependencies

Install the Python dependencies in your global Python environment or virtual environment (`venv`):

```bash
# Optional: create and activate a venv
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt
```

*(Note: dependencies include `fastapi`, `uvicorn[standard]`, `pydantic`, `pytest`, `httpx`)*

### 3.2 Frontend Dependencies

Install npm packages in the `frontend` folder:

```bash
cd frontend
npm install
cd ..
```

---

## 4. Single-Command Launch (Recommended)

Orbital Twin includes unified launchers that boot both backend and frontend concurrently:

### Windows (Command Prompt / Double Click)
```cmd
launch.bat
```

### Windows (PowerShell)
```powershell
.\launch.ps1
```

### Linux / macOS / WSL
```bash
chmod +x launch.sh
./launch.sh
```

Once launched:
- **Operator Frontend:** [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 5. Manual Startup (Development Mode)

If you prefer running components in dedicated terminal tabs:

### Terminal 1: Backend
```bash
python -m uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```

---

## 6. Production Build & Static Serving Mode

To create an optimized production build of the frontend:

```bash
cd frontend
npm run build
```

This compiles TypeScript, optimizes bundle assets, and emits production static files to `frontend/dist/`.

You can test the production build locally via:
```bash
npm run preview
```

---

## 7. Database & Persistent Mission Vault (PostgreSQL & SQLite)

Orbital Twin uses a hybrid dual-tier state architecture:
1. **In-Memory Physics Engine (`SimulationEngine` + `CanonicalSpacecraftState`):** Single source of truth handling 100% of real-time simulation ticks, telemetry streaming, fault cascades, and 3D digital twin updates at maximum velocity.
2. **Persistent Mission History (SQLAlchemy + PostgreSQL):**
   - Automatically stores simulation run records, battery SOC profiles, injected faults, executed recovery policies, and generated post-flight reports.
   - Configured via the `DATABASE_URL` environment variable.
   - Seamless local fallback: If `DATABASE_URL` is omitted, the platform automatically boots using local SQLite storage (`backend/orbital_twin.db`) without requiring external database installation.
   - In production (e.g. Render), connects natively to Render's managed PostgreSQL database.

---

## 8. Authentication & Production RBAC System

Orbital Twin implements a production-grade server-side Role-Based Access Control (RBAC) architecture:
- Authoritative user roles stored securely in the database (PostgreSQL/SQLite).
- High-security password hashing using **bcrypt** with per-user salt.
- Cryptographically signed **JWT access tokens** (HMAC-SHA256).
- Reusable FastAPI backend security dependencies (`require_authenticated_user`, `require_role`, `require_any_role`, `require_admin_role`).
- Server-side rejection with **HTTP 401 Unauthorized** (missing/invalid credentials) and **HTTP 403 Forbidden** (insufficient role privileges).
- Frontend UI navigation tabs and privileged action buttons dynamically adapt to the authenticated role.

### Authoritative Demo Credentials:

| Call Sign / Username | Password | Role | Primary Purpose |
| :--- | :--- | :--- | :--- |
| `mission_admin` | `admin123` | **Mission Administrator** | **Full Access Demo & Judge Account** |
| `mission_operator` | `password123` | **Mission Operator** | Read-only telemetry and mission monitoring |
| `flight_director` | `password123` | **Flight Director** | Recovery policy approval & flight software execution |
| `simulation_engineer` | `password123` | **Simulation Engineer** | Dynamic fault injection & simulation lab experimentation |

*(Backwards-compatible developer aliases `admin`/`admin123`, `operator`/`password123`, `flight_dir`/`securepassword`, and `simulation_eng`/`password123` are also maintained).*

### 4-Role Permission Matrix:

| Capability / API Endpoint | Mission Operator | Flight Director | Simulation Engineer | Mission Administrator |
| :--- | :---: | :---: | :---: | :---: |
| **Mission Control & 3D Digital Twin** (`/missions`, `/spacecraft/state`) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Full Access |
| **Telemetry & Timeline Workbench** (`/telemetry`, `/timeline`) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Full Access |
| **Mission & Simulation History** (`/history/runs`) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Full Access |
| **Post-Flight Reports** (`/reports`) | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Full Access |
| **Recovery Simulation Comparison** (`POST /recovery/simulate`) | ❌ 403 | ✅ Allowed | ✅ Allowed | ✅ Full Access |
| **Live Recovery Execution** (`POST /recovery/apply`) | ❌ 403 | ✅ Allowed | ❌ 403 | ✅ Full Access |
| **Fault Injection & Clearing** (`POST/DELETE /faults`) | ❌ 403 | ❌ 403 | ✅ Allowed | ✅ Full Access |
| **Demo Fault Presets** (`POST /preset/v003-demo`) | ❌ 403 | ❌ 403 | ✅ Allowed | ✅ Full Access |
| **Administrator User Management** (`GET /admin/users`) | ❌ 403 | ❌ 403 | ❌ 403 | ✅ Full Access |

---

## 9. Render Cloud Deployment

Orbital Twin is pre-configured for automated deployment on [Render](https://render.com) using the included `render.yaml` blueprint.

### Target Architecture:
```text
GitHub Repository
   ↓
Render Cloud Blueprint
   ├── Frontend (Static Site / CDN) -> orbital-twin-frontend
   ├── Backend (FastAPI Web Service) -> orbital-twin-backend
   └── Database (PostgreSQL)         -> orbital-twin-postgres
```

### Steps to Deploy:
1. Push your repository to GitHub.
2. Log into the Render Dashboard and click **New +** → **Blueprint**.
3. Select your repository. Render will automatically parse `render.yaml` and provision:
   - Managed PostgreSQL database
   - Python FastAPI backend web service
   - React 19 / Vite static frontend
4. Once deployed, the frontend automatically routes WebSocket and REST calls to the backend via `VITE_API_URL`.

---

## 8. Running Automated Test Suites

Orbital Twin includes a rigorous automated test suite validating all aerospace constraints, validation test cases (V-001 through V-015), and the complete 13-stage end-to-end demo scenario.

### Run Backend Unit & Integration Tests:
```bash
cd backend
python -m pytest -v
```

Expected output:
```text
tests/test_api.py .................. PASSED
tests/test_demo_scenario.py ......... PASSED
tests/test_environment_and_clock.py . PASSED
tests/test_power_subsystem.py ....... PASSED
tests/test_validation_cases.py ...... PASSED
==================== 30 passed in ~1.3s ====================
```

### Run Frontend Static Type & Linter Checks:
```bash
cd frontend
npm run build   # Type-checks TSX across entire codebase
npm run lint    # Runs fast oxlint rules
```

---

## 9. Common Errors & Troubleshooting

### Issue 1: `Port 8000 already in use`
- **Cause:** Another process or previous uvicorn instance is holding port 8000.
- **Resolution (Windows):** Run `netstat -ano | findstr :8000` to find PID, then `taskkill /PID <PID> /F`.
- **Resolution (Linux/Mac):** Run `lsof -i :8000` and `kill -9 <PID>`.

### Issue 2: `WebSocket connection failed: ws://localhost:8000/ws/simulation/...`
- **Cause:** Frontend started before backend finished initializing, or backend crashed.
- **Resolution:** Verify backend terminal is active and accessible at `http://localhost:8000/health`. The frontend automatically falls back to HTTP polling if WebSocket is offline.

### Issue 3: `WebGL context not supported`
- **Cause:** Hardware acceleration is disabled in your web browser.
- **Resolution:** In Chrome/Edge, visit `chrome://settings/system` and enable **Use graphics acceleration when available**.

### Issue 4: Python module not found (`No module named 'backend'`)
- **Cause:** Python executed from the wrong directory.
- **Resolution:** Always execute Python commands from the project root (`Orbital_Twin_Antigravity_Documentation`), e.g.:
  `python -m uvicorn backend.api.main:app` instead of `cd backend && uvicorn main:app`.
