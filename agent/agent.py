#!/usr/bin/env python3
import os, time, requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

SIEM_API_URL = os.getenv("SIEM_API_URL", "http://127.0.0.1:8000/logs")
SIEM_API_KEY = os.getenv("SIEM_API_KEY", "testkey123")
AUTH_LOG = os.getenv("AUTH_LOG", "./agent/test_auth.log")
SOURCE = os.getenv("SOURCE", "agent-host")
POLL_INTERVAL = float(os.getenv("POLL_INTERVAL", "0.5"))
headers = {"x-api-key": SIEM_API_KEY, "Content-Type": "application/json"}

def tail_file(path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text("")
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        f.seek(0, 2)
        while True:
            line = f.readline()
            if not line:
                time.sleep(POLL_INTERVAL)
                continue
            yield line.rstrip("\n")

def build_payload(line):
    from datetime import datetime
    return {"source": SOURCE, "timestamp": datetime.utcnow().isoformat() + "Z", "message": line}

def post_line(line):
    try:
        r = requests.post(SIEM_API_URL, headers=headers, json=build_payload(line), timeout=5)
        if r.status_code not in (200,201):
            print(f"[agent] WARN status={r.status_code} body={r.text}")
        else:
            print(f"[agent] posted: {line[:120]}")
    except Exception as e:
        print("[agent] ERROR posting:", e)

def main():
    print(f"[agent] tailing {AUTH_LOG}, posting to {SIEM_API_URL}")
    for ln in tail_file(AUTH_LOG):
        if ln.strip():
            post_line(ln)

if __name__ == "__main__":
    main()

