# Project Tutwiler – Mission Control API + Dashboard

This is a small proof-of-concept “Mission Control” triage console:

- Backend: .NET Web API
- DB: MySQL (`mission_control_db`)
- UI: static dashboard (HTML/JS) served from the API (`wwwroot/index.html`)
- Features:
  - Sites, Users, Assets, Alerts, Decisions tables
  - Active alert queue with GO / HOLD / ESCALATE
  - Per-alert decision history
  - Site selector (All / per site)
  - Metrics (bands, statuses, decisions, coverage)
  - Recent Alerts list with filters

---

## 1. Prerequisites

- .NET SDK 9.x
- MySQL Server + MySQL Workbench

---

## 2. Database Setup

1. Open MySQL Workbench and connect to `localhost`.
2. Run `db_schema.sql` to create the `mission_control_db` schema.
3. Run `db_seed.sql` to insert sample sites, assets, alerts, and decisions.

## 3. Configure the API

Edit `MissionControl.Api/appsettings.json`:

```json
"ConnectionStrings": {
  "MissionControlDb": "Server=localhost;Port=3306;Database=mission_control_db;User=YOUR_USER;Password=YOUR_PASSWORD;TreatTinyAsBoolean=true"
}
