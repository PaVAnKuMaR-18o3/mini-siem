# Mini-SIEM (Security Information & Event Management)

A full-stack **Mini-SIEM** system that ingests logs, detects security events, and visualizes alerts in real time.  
Built with **FastAPI, MongoDB, React, and Docker**.

---

## 🚀 Features
- Log ingestion REST API
- Real-time security alert detection
- JWT-protected backend (FastAPI)
- Interactive dashboard (React + Vite)
- WebSocket-based live updates
- Fully Dockerized frontend and backend

---

## 🛠 Tech Stack

### Backend
- FastAPI
- MongoDB
- PyJWT
- WebSockets

### Frontend
- React
- Vite
- Chart.js / Recharts

### Infrastructure
- Docker
- Docker Compose

---

## 🧱 Architecture
- **Frontend:** React + Vite dashboard
- **Backend:** FastAPI REST & WebSocket server
- **Database:** MongoDB for logs and alerts
- **Realtime:** WebSocket channel for live alert streaming

---

## ⚙️ Getting Started

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

Swagger	http://localhost:8000/docs
🔐 API Authentication

Login endpoint: /auth/login

Uses JWT Bearer tokens

Protected routes require:

Authorization: Bearer <token>

📸 Screenshots
Dashboard

API Documentation (Swagger)

Docker Containers Running

📦 Deployment

This project is fully containerized using Docker, ensuring consistent deployment across environments.

🔮 Future Enhancements

Role-based access control (RBAC)

Advanced alert correlation rules

Cloud deployment (AWS / GCP)

SIEM rule engine expansion

👨‍💻 Author
Pavan Kumar
