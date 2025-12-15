# Mini-SIEM (Security Information & Event Management)

A full-stack Mini-SIEM system that ingests logs, detects security events, and visualizes alerts in real time.

---

## Features
- 📡 **Log ingestion API**
- ⚡ **Real-time alert detection**
- 🔒 **JWT-protected backend** (FastAPI)
- 🖥️ **Interactive dashboard** (React + Vite)
- 🔄 **WebSocket live updates**
- 🐳 **Dockerized frontend & backend**

---

## Tech Stack

### Backend
- `FastAPI`
- `MongoDB`
- `PyJWT`
- `WebSockets`

### Frontend
- `React`
- `Vite`
- `Chart.js` / `Recharts`

### Infrastructure
- `Docker`
- `Docker Compose`

---

## Architecture
- Frontend (React + Vite)
- Backend (FastAPI)
- MongoDB for log and alert storage
- WebSocket channel for real-time alerts

---

## Getting Started

### Prerequisites
- Docker
- Docker Compose

### Run the project
```bash
docker compose up --build

Services
Service	URL
Frontend	http://localhost:5173
Backend	http://localhost:8000
Swagger Docs	http://localhost:8000/docs


API Authentication
Login endpoint: POST /auth/login

Uses JWT Bearer tokens.

Protected routes require the Authorization header:

HTTP

Authorization: Bearer <your_token_here>

Screenshots
Dashboard

API Documentation (Swagger)

Docker Containers Running

Deployment
This project is fully containerized using Docker to ensure consistent deployment across environments.

Future Enhancements
[ ] Role-based access control (RBAC)

[ ] Advanced alert correlation rules

[ ] Cloud deployment (AWS / GCP)
