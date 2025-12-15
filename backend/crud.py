# backend/crud.py

from datetime import datetime
from typing import Any, Dict, List, Optional

from .database import logs_coll, alerts_coll
from .detector import run_detection


def _model_to_dict(log: Any) -> Dict[str, Any]:
    """
    Accept either:
      - Pydantic v2 model (has .model_dump())
      - Pydantic v1 model (has .dict())
      - plain dict
    and return a dict.
    """
    if isinstance(log, dict):
        return log
    if hasattr(log, "model_dump"):  # Pydantic v2
        return log.model_dump()
    if hasattr(log, "dict"):  # Pydantic v1
        return log.dict()
    raise TypeError(f"Unsupported log type: {type(log)}")


def _normalize_ts(doc: Dict[str, Any]) -> Dict[str, Any]:
    ts = doc.get("timestamp")
    if isinstance(ts, datetime):
        doc["timestamp"] = ts.isoformat()
    return doc


async def insert_log(log: Any) -> None:
    """
    Insert a log into MongoDB and run detection rules.
    Works with both Motor (async) and PyMongo (sync) collections.
    """
    data = _model_to_dict(log)

    ts = data.get("timestamp")
    if isinstance(ts, str):
        try:
            data["timestamp"] = datetime.fromisoformat(ts.replace("Z", ""))
        except Exception:
            data["timestamp"] = datetime.utcnow()
    elif not isinstance(ts, datetime):
        data["timestamp"] = datetime.utcnow()

    # Handle both async and sync insert_one
    maybe_coro = logs_coll.insert_one(data)
    if hasattr(maybe_coro, "__await__"):
        result = await maybe_coro
    else:
        result = maybe_coro

    inserted_id = getattr(result, "inserted_id", None)
    if inserted_id is not None:
        data["_id"] = inserted_id

    # Run detection AFTER the log is stored
    await run_detection(data)


async def recent_logs(
    limit: int = 50,
    *,
    page: int = 1,
    ip: Optional[str] = None,
    source: Optional[str] = None,
    contains: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Get recent logs with optional filters + pagination.
    """
    # Build Mongo query
    conditions: List[Dict[str, Any]] = []

    if ip:
        conditions.append({"message": {"$regex": ip}})
    if source:
        conditions.append({"source": source})
    if contains:
        conditions.append({"message": {"$regex": contains}})

    if conditions:
        query: Dict[str, Any] = {"$and": conditions}
    else:
        query = {}

    # Pagination
    if page < 1:
        page = 1
    skip = (page - 1) * limit

    cursor = (
        logs_coll.find(query)
        .sort("timestamp", -1)
        .skip(skip)
        .limit(limit)
    )

    # Motor cursor has .to_list(); PyMongo cursor is just iterable
    to_list = getattr(cursor, "to_list", None)
    if callable(to_list):
        maybe_coro = to_list(length=limit)
        if hasattr(maybe_coro, "__await__"):
            docs = await maybe_coro
        else:
            docs = maybe_coro
    else:
        docs = list(cursor)

    out: List[Dict[str, Any]] = []
    for d in docs:
        d["_id"] = str(d["_id"])
        out.append(_normalize_ts(d))
    return out


async def recent_alerts(
    limit: int = 50,
    *,
    page: int = 1,
    ip: Optional[str] = None,
    type_: Optional[str] = None,
    severity: Optional[str] = None,
    source: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Get recent alerts with optional filters + pagination.
    """
    conditions: List[Dict[str, Any]] = []

    if ip:
        conditions.append({"ip": ip})
    if type_:
        conditions.append({"type": type_})
    if severity:
        conditions.append({"severity": severity})
    if source:
        conditions.append({"source": source})

    if conditions:
        query: Dict[str, Any] = {"$and": conditions}
    else:
        query = {}

    if page < 1:
        page = 1
    skip = (page - 1) * limit

    cursor = (
        alerts_coll.find(query)
        .sort("timestamp", -1)
        .skip(skip)
        .limit(limit)
    )

    to_list = getattr(cursor, "to_list", None)
    if callable(to_list):
        maybe_coro = to_list(length=limit)
        if hasattr(maybe_coro, "__await__"):
            docs = await maybe_coro
        else:
            docs = maybe_coro
    else:
        docs = list(cursor)

    out: List[Dict[str, Any]] = []
    for d in docs:
        d["_id"] = str(d["_id"])
        out.append(_normalize_ts(d))
    return out
