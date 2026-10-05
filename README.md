# ORBITAL TWIN

## Digital Twin for Mission ORBIT-X1

Orbital Twin is a spacecraft digital twin platform designed to simulate, monitor, analyze, and support recovery of spacecraft operations.

The system creates a software representation of a spacecraft and provides a unified environment for mission monitoring, telemetry, fault analysis, simulation, and recovery planning.

## Core Concept

Orbital Twin follows a closed-loop mission operations workflow:

Simulation → Monitoring → Fault Detection → Impact Analysis → Recovery → Verification

## Key Features

- Spacecraft Digital Twin
- Real-time spacecraft simulation
- Live telemetry monitoring
- Power and subsystem monitoring
- Fault injection and analysis
- Fault propagation analysis
- Recovery planning and execution
- Mission timeline
- Simulation history
- Mission reports
- Mission operations dashboard

## Mission Scenario

The platform can simulate spacecraft anomalies such as solar power degradation and analyze how the fault affects spacecraft power, battery state, payload operations, and overall mission health.

Example:

Solar Degradation
→ Reduced Power Generation
→ Power Deficit
→ Battery Discharge
→ Payload Impact
→ Recovery Action

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Three.js

### Backend
- Python
- FastAPI
- Uvicorn

### Database
- PostgreSQL
- SQLAlchemy

### Authentication
- JWT
- bcrypt

## Project Structure

```text
ORBIT_X1/
├── backend/
├── frontend/
├── documentation/
├── README.md
└── .gitignore