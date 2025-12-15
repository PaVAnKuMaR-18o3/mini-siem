# backend/app.py
from datetime import datetime, timedelta
from typing import Optional, List
import requests
import asyncio 

from fastapi import (
    FastAPI, BackgroundTasks, Header, HTTPException, Depends,
    WebSocket, WebSocketDisconnect, Query
)
from fastapi.middleware.cors import CORSMiddleware

from backend.models import LogIn
from backend.crud import insert_log, recent_logs, recent_alerts
from backend.detector import analyze_log
from backend.config import settings
from backend.auth import LoginRequest, Token, authenticate_user, create_access_token, get_current_user
from backend.database import logs_coll, alerts_coll  # PyMongo sync collections

# ==================== WebSocket Manager ====================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active_connections = [c for c in self.active_connections if c != ws]

    async def broadcast(self, message: dict):
        for ws in self.active_connections[:]:
            try:
                await ws.send_json(message)
            except:
                self.disconnect(ws)

manager = ConnectionManager()

# ==================== Real-time Broadcasts ====================
from backend import detector, crud

# Alert broadcast
orig_alert = detector._create_alert
async def _ws_alert(**kwargs):
    await orig_alert(**kwargs)
    ts = kwargs.get("timestamp", datetime.utcnow())
    ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
    await manager.broadcast({
        "type": "alert",
        "timestamp": ts_str,
        "message": f"[{kwargs.get('severity','INFO')}] {kwargs.get('description','')}",
        "data": kwargs
    })
detector._create_alert = _ws_alert

# Log broadcast
orig_log = crud.insert_log
async def _ws_log(log):
    await orig_log(log)
    log_dict = log if isinstance(log, dict) else log.model_dump()
    ts = log_dict.get("timestamp", datetime.utcnow())
    ts_str = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
    await manager.broadcast({
        "type": "log",
        "timestamp": ts_str,
        "message": log_dict.get("message", ""),
        "data": log_dict
    })
crud.insert_log = _ws_log

# ==================== FastAPI App ====================
app = FastAPI(title="mini-siem")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== CHART ENDPOINTS – SYNC VERSION (PyMongo) ====================
@app.get("/stats/alerts-over-time")
async def alerts_over_time(_=Depends(get_current_user)):
    now = datetime.utcnow()
    start = now - timedelta(hours=24)

    pipeline = [
        {"$match": {"timestamp": {"$gte": start}}},
        {"$group": {"_id": {"$hour": {"date": "$timestamp", "timezone": "UTC"}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    # PyMongo: aggregate returns iterable cursor → list() it
    docs = list(alerts_coll.aggregate(pipeline))

    full = {f"{h:02d}:00": 0 for h in range(24)}
    for doc in docs:
        hour = str(doc["_id"]).zfill(2) + ":00"
        full[hour] = doc["count"]

    return [{"hour": h, "count": c} for h, c in full.items()]


@app.get("/stats/severity-distribution")
async def severity_distribution(_=Depends(get_current_user)):
    pipeline = [
        {"$group": {"_id": "$severity", "value": {"$sum": 1}}},
        {"$sort": {"value": -1}}
    ]
    docs = list(alerts_coll.aggregate(pipeline))
    return [{"name": (d["_id"] or "UNKNOWN").upper(), "value": d["value"]} for d in docs]


@app.get("/stats/top-source-ips")
async def top_source_ips(_=Depends(get_current_user)):
    pipeline = [
        {"$match": {"$or": [{"source_ip": {"$ne": None}}, {"ip": {"$ne": None}}]}},
        {"$project": {"ip": {"$ifNull": ["$source_ip", "$ip"]}}},
        {"$group": {"_id": "$ip", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    docs = list(alerts_coll.aggregate(pipeline))
    return [{"ip": d["_id"] or "unknown", "count": d["count"]} for d in docs]


@app.get("/stats")
async def get_stats(_=Depends(get_current_user)):
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    return {
        "total_logs": logs_coll.count_documents({}),
        "total_alerts": alerts_coll.count_documents({}),
        "alerts_last_24h": alerts_coll.count_documents({"timestamp": {"$gte": last_24h}}),
        "server_time": now.isoformat()
    }


# ==================== Other Endpoints ====================
@app.get("/")
async def root():
    return {"msg": "mini-siem running"}

@app.post("/auth/login", response_model=Token)
async def login(body: LoginRequest):
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(401, "Bad credentials")
    return Token(access_token=create_access_token({"sub": user["username"]}))

@app.post("/logs", status_code=201)
async def receive_log(log: LogIn, bg: BackgroundTasks, x_api_key: Optional[str] = Header(None)):
    if x_api_key != settings.API_KEY:
        raise HTTPException(401, "Invalid API key")
    await insert_log(log)
    bg.add_task(analyze_log, log.model_dump())
    return {"status": "ok"}

@app.get("/logs")
async def get_logs(limit: int = 100, page: int = 1, ip: Optional[str] = None,
                   source: Optional[str] = None, contains: Optional[str] = None,
                   user=Depends(get_current_user)):
    return await recent_logs(limit, page=page, ip=ip, source=source, contains=contains)

@app.get("/alerts")
async def get_alerts(limit: int = 100, page: int = 1, ip: Optional[str] = None,
                     type: Optional[str] = None, severity: Optional[str] = None,
                     source: Optional[str] = None, user=Depends(get_current_user)):
    return await recent_alerts(limit, page=page, ip=ip, type_=type, severity=severity, source=source)

@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket, token: str = None):
    if not token:
        await websocket.close(code=1008)
        return
    # Verify token
    try:
        if get_current_user(token) is None:
             await websocket.close(code=1008)
             return
    except:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        manager.disconnect(websocket)