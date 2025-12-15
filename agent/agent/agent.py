#!/usr/bin/env python3
"""
Simple log shipping agent for mini-SIEM.

Usage examples:

  # Tail a log file and send new lines
  python agent.py /var/log/auth.log

  # Tail with explicit options
  python agent.py /var/log/auth.log \
      --api-url http://127.0.0.1:8000/logs \
      --api-key testkey123 \
      --source home-lab

The agent:
  - Follows the file (like `tail -F`)
  - Wraps each line into JSON {source, timestamp, message}
  - Sends it to the backend /logs with x-api-key
"""

import argparse
import json
import os
import time
from datetime import datetime, timezone
from typing import Iterator

import requests


DEFAULT_API_URL = "http://127.0.0.1:8000/logs"
DEFAULT_API_KEY = "testkey123"   # change if you changed backend settings
DEFAULT_SOURCE = "home-lab"
RETRY_SLEEP_SECONDS = 2.0


def iso_utc_now() -> str:
    """Return current time in ISO8601 with Z."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def follow_file(path: str) -> Iterator[str]:
    """
    Follow a file forever, yielding new lines as they are written.
    Similar to: tail -F
    """
    # Wait until file exists
    while not os.path.exists(path):
        print(f"[agent] Waiting for file {path} to appear...")
        time.sleep(1.0)

    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        # Jump to end of file
        f.seek(0, os.SEEK_END)

        while True:
            line = f.readline()
            if not line:
                time.sleep(0.2)
                continue

            # Strip trailing newline
            yield line.rstrip("\r\n")


def send_log_line(
    api_url: str,
    api_key: str,
    source: str,
    line: str,
    dry_run: bool = False,
) -> None:
    """
    Wrap a single log line and send it to the mini-SIEM backend.
    """
    payload = {
        "source": source,
        "timestamp": iso_utc_now(),
        "message": line,
    }

    if dry_run:
        print(f"[dry-run] Would send: {json.dumps(payload)}")
        return

    headers = {
        "Content-Type": "application/json",
        "x-api-key": api_key,
    }

    while True:
        try:
            resp = requests.post(api_url, headers=headers, json=payload, timeout=5)
        except Exception as exc:
            print(f"[agent] Error sending log line: {exc!r}")
            print(f"[agent] Retrying in {RETRY_SLEEP_SECONDS} seconds...")
            time.sleep(RETRY_SLEEP_SECONDS)
            continue

        if resp.status_code >= 200 and resp.status_code < 300:
            # Optional: comment this out if it becomes too noisy
            print(f"[agent] Sent line (status {resp.status_code})")
            return

        print(
            f"[agent] Backend returned {resp.status_code}: {resp.text!r}. "
            f"Retrying in {RETRY_SLEEP_SECONDS} seconds..."
        )
        time.sleep(RETRY_SLEEP_SECONDS)


def main() -> None:
    parser = argparse.ArgumentParser(description="mini-SIEM log shipping agent")
    parser.add_argument(
        "logfile",
        help="Path to log file to follow (e.g. /var/log/auth.log)",
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_URL,
        help=f"mini-SIEM /logs endpoint (default: {DEFAULT_API_URL})",
    )
    parser.add_argument(
        "--api-key",
        default=DEFAULT_API_KEY,
        help="x-api-key value for backend (default: testkey123)",
    )
    parser.add_argument(
        "--source",
        default=DEFAULT_SOURCE,
        help=f'Source name to tag logs with (default: "{DEFAULT_SOURCE}")',
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Do not send to backend, just print what would be sent",
    )

    args = parser.parse_args()

    print("[agent] Starting mini-SIEM agent")
    print(f"[agent]  Log file : {args.logfile}")
    print(f"[agent]  API URL  : {args.api-url if hasattr(args, 'api-url') else args.api_url}")
    print(f"[agent]  Source   : {args.source}")
    if args.dry_run:
        print("[agent]  Mode     : DRY RUN (no data will be sent)")
    else:
        print("[agent]  Mode     : LIVE (sending to backend)")

    # Fix for attr name with dash in debug print above
    api_url = args.api_url

    try:
        for line in follow_file(args.logfile):
            send_log_line(
                api_url=api_url,
                api_key=args.api_key,
                source=args.source,
                line=line,
                dry_run=args.dry_run,
            )
    except KeyboardInterrupt:
        print("\n[agent] Stopping (Ctrl+C)")


if __name__ == "__main__":
    main()
