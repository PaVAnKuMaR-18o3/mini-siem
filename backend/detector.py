# backend/detector.py

import re
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Set, List

from .database import logs_coll, alerts_coll


def _to_dt(value: Any) -> datetime:
    """
    Convert a timestamp (datetime or ISO string) to datetime.
    Falls back to now() if parsing fails.
    """
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            # strip trailing Z if present
            return datetime.fromisoformat(value.replace("Z", ""))
        except Exception:
            pass
    return datetime.utcnow()


async def _create_alert(
    *,
    source: str,
    timestamp: Any,
    severity: str,
    type_: str,
    description: str,
    ip: Optional[str] = None,
) -> None:
    """
    Insert an alert document. DB call is sync (PyMongo), so no await.
    """
    doc: Dict[str, Any] = {
        "source": source,
        "timestamp": _to_dt(timestamp),
        "severity": severity,
        "type": type_,
        "description": description,
    }
    if ip:
        doc["ip"] = ip

    # PyMongo insert_one is synchronous – do NOT await this
    alerts_coll.insert_one(doc)


# ---------- RULE 1: SSH brute-force ----------

SSH_FAIL_RE = re.compile(
    r"Failed password for (invalid user )?(?P<user>\S+) from (?P<ip>\d+\.\d+\.\d+\.\d+).*ssh2"
)


async def _rule_ssh_bruteforce(log: Dict[str, Any]) -> None:
    """
    Look for many failed SSH logins from the same IP in a short period.
    Threshold: >= 5 failures in 60 seconds.
    """
    msg = log.get("message", "")
    m = SSH_FAIL_RE.search(msg)
    if not m:
        return

    ip = m.group("ip")
    ts = _to_dt(log.get("timestamp"))
    window_start = ts - timedelta(seconds=60)

    # PyMongo count_documents is sync – no await
    count: int = logs_coll.count_documents(
        {
            "message": {"$regex": ip},
            "timestamp": {"$gte": window_start, "$lte": ts},
        }
    )

    if count >= 5:
        description = f"{count} failed SSH attempts detected from {ip} within 60 seconds."
        await _create_alert(
            source=log.get("source", "unknown"),
            timestamp=ts,
            severity="HIGH",
            type_="Brute Force",
            description=description,
            ip=ip,
        )


# ---------- RULE 2: Port scan detection ----------

GENERIC_CONN_RE = re.compile(
    r"from (?P<ip>\d+\.\d+\.\d+\.\d+) port (?P<port>\d+)"
)


async def _rule_port_scan(log: Dict[str, Any]) -> None:
    """
    If an IP hits >= 10 different ports within 2 minutes, flag port scan.
    Works with generic 'from <ip> port <port>' style logs.
    """
    msg = log.get("message", "")
    m = GENERIC_CONN_RE.search(msg)
    if not m:
        return

    ip = m.group("ip")
    ts = _to_dt(log.get("timestamp"))
    window_start = ts - timedelta(minutes=2)

    pipeline = [
        {
            "$match": {
                "message": {"$regex": ip},
                "timestamp": {"$gte": window_start, "$lte": ts},
            }
        },
        {"$project": {"message": 1, "timestamp": 1}},
    ]

    # PyMongo aggregate is sync – turn cursor into a list
    cursor = logs_coll.aggregate(pipeline)
    docs: List[Dict[str, Any]] = list(cursor)

    ports: Set[int] = set()
    for d in docs:
        m2 = GENERIC_CONN_RE.search(d.get("message", ""))
        if m2:
            try:
                ports.add(int(m2.group("port")))
            except ValueError:
                continue

    if len(ports) >= 10:
        description = (
            f"Possible port scan: {len(ports)} distinct ports targeted from {ip} "
            f"within 2 minutes."
        )
        await _create_alert(
            source=log.get("source", "unknown"),
            timestamp=ts,
            severity="MEDIUM",
            type_="Port Scan",
            description=description,
            ip=ip,
        )


# ---------- RULE 3: SQL injection attempt detection ----------

SQLI_PATTERNS = [
    r"UNION\s+SELECT",
    r"\bOR\b\s+1=1",
    r"' OR '1'='1",
    r"\" OR \"1\"=\"1",
    r"DROP\s+TABLE",
    r"--\s",
    r"/\*",
]

SQLI_RE = re.compile("|".join(SQLI_PATTERNS), re.IGNORECASE)


async def _rule_sql_injection(log: Dict[str, Any]) -> None:
    """
    Very simple pattern-based SQL injection attempt detection.
    Assumes HTTP logs or app logs where the request payload is in 'message'.
    """
    msg = log.get("message", "")
    if not msg:
        return

    if SQLI_RE.search(msg):
        ip_match = re.search(r"(?P<ip>\d+\.\d+\.\d+\.\d+)", msg)
        ip = ip_match.group("ip") if ip_match else None
        description = "Potential SQL injection payload detected in log message."
        await _create_alert(
            source=log.get("source", "unknown"),
            timestamp=log.get("timestamp"),
            severity="HIGH",
            type_="SQL Injection",
            description=description,
            ip=ip,
        )


# ---------- RULE 4: Suspicious root login ----------

ROOT_LOGIN_RE = re.compile(
    r"Accepted (password|publickey) for root from (?P<ip>\d+\.\d+\.\d+\.\d+)"
)


async def _rule_root_login(log: Dict[str, Any]) -> None:
    """
    Flag any successful root SSH login as HIGH severity.
    """
    msg = log.get("message", "")
    m = ROOT_LOGIN_RE.search(msg)
    if not m:
        return

    ip = m.group("ip")
    description = f"Suspicious root SSH login detected from {ip}."
    await _create_alert(
        source=log.get("source", "unknown"),
        timestamp=log.get("timestamp"),
        severity="HIGH",
        type_="Root Login",
        description=description,
        ip=ip,
    )


# ---------- MAIN ENTRY ----------

async def run_detection(log: Dict[str, Any]) -> None:
    """
    Call all detection rules for a single log document.
    """
    await _rule_ssh_bruteforce(log)
    await _rule_port_scan(log)
    await _rule_sql_injection(log)
    await _rule_root_login(log)


# Backwards-compatible name for older imports / BackgroundTasks
async def analyze_log(log: Dict[str, Any], *args: Any, **kwargs: Any) -> None:
    """
    Wrapper used by FastAPI BackgroundTasks.
    Extra *args/**kwargs are ignored so older call patterns still work.
    """
    await run_detection(log)
