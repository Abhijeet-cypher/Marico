import json
import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "calls.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS calls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            retailer_id TEXT,
            retailer_name TEXT,
            created_at TEXT,
            outcome TEXT,
            summary TEXT,
            follow_up TEXT,
            products TEXT,
            transcript TEXT
        )
        """
    )
    conn.commit()
    conn.close()


def row_to_dict(row):
    call = dict(row)
    call["products"] = json.loads(call["products"])
    call["transcript"] = json.loads(call["transcript"])
    return call


def save_call(retailer, transcript, result):
    conn = get_connection()
    cursor = conn.execute(
        """
        INSERT INTO calls
            (retailer_id, retailer_name, created_at, outcome, summary, follow_up, products, transcript)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            retailer["id"],
            retailer["name"],
            datetime.now().isoformat(timespec="seconds"),
            result.get("outcome", ""),
            result.get("summary", ""),
            result.get("follow_up", ""),
            json.dumps(result.get("products", [])),
            json.dumps(transcript),
        ),
    )
    conn.commit()
    call_id = cursor.lastrowid
    conn.close()
    return get_call(call_id)


def list_calls():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM calls ORDER BY id DESC").fetchall()
    conn.close()
    return [row_to_dict(r) for r in rows]


def get_call(call_id):
    conn = get_connection()
    row = conn.execute("SELECT * FROM calls WHERE id = ?", (call_id,)).fetchone()
    conn.close()
    return row_to_dict(row) if row else None
