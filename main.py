import psycopg2
from psycopg2 import pool
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Union, Any
import os

app = FastAPI(title="LetzRyd Walk-In Registry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────
# Connection Pool
# ─────────────────────────────────────────────────────────
try:
    postgreSQL_pool = psycopg2.pool.SimpleConnectionPool(
        1, 20,
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASS", r"8S5]U3@L^Xz)\FH}"),
        host=os.environ.get("DB_HOST", "35.200.196.113"),
        port=os.environ.get("DB_PORT", "5432"),
        database=os.environ.get("DB_NAME", "postgres")
    )
    if postgreSQL_pool:
        print("[OK] Connection pool created successfully")
except (Exception, psycopg2.DatabaseError) as error:
    print("[ERROR] Error connecting to PostgreSQL:", error)


# ─────────────────────────────────────────────────────────
# Startup — Tables + Seed Data
# ─────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()

        # ── cities ──────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS cities (
                id   SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE
            );
        """)
        cur.execute("SELECT COUNT(*) FROM cities;")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO cities (name) VALUES
                ('Hyderabad'), ('Bangalore'), ('Mumbai'), ('Chennai'), ('Delhi')
                ON CONFLICT (name) DO NOTHING;
            """)
            print("[OK] Cities seeded")

        # ── users (executives) ───────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id   SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL
            );
        """)
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(255) DEFAULT 'Executive';")

        cur.execute("SELECT COUNT(*) FROM users;")
        if cur.fetchone()[0] == 0:
            cur.execute("""
                INSERT INTO users (name, role) VALUES
                ('D Shiva',      'Driver Relations Manager'),
                ('Arshad Khan',  'Onboarding Specialist'),
                ('Priya Sharma', 'Partner Onboarding Lead'),
                ('Rohan Verma',  'Executive Assistant'),
                ('Sneha Reddy',  'Regional Operations Manager');
            """)
            print("[OK] Executives seeded")

        # ── walkins ──────────────────────────────────────
        cur.execute("""
            CREATE TABLE IF NOT EXISTS walkins (
                id             SERIAL PRIMARY KEY,
                visitor_type   VARCHAR(50),
                event_date     VARCHAR(20),
                city           VARCHAR(255),
                executive_id   INTEGER REFERENCES users(id),
                person_name    VARCHAR(255),
                person_number  VARCHAR(50),
                aadhaar_number VARCHAR(20),
                dl_number      VARCHAR(100),
                aadhaar_image  TEXT,
                dl_image       TEXT,
                visiting_reason VARCHAR(50),
                joined_status  VARCHAR(50),
                remarks        TEXT,
                created_at     TIMESTAMP DEFAULT NOW()
            );
        """)
        # Add columns for existing deployments
        for col in [
            "aadhaar_number VARCHAR(20)",
            "aadhaar_image  TEXT",
            "dl_image       TEXT",
            "created_at     TIMESTAMP DEFAULT NOW()",
        ]:
            cur.execute(f"ALTER TABLE walkins ADD COLUMN IF NOT EXISTS {col};")

        # Seed walk-ins if empty
        cur.execute("SELECT COUNT(*) FROM walkins;")
        if cur.fetchone()[0] == 0:
            cur.execute("SELECT id, name FROM cities ORDER BY id;")
            city_map = {n: i for i, n in cur.fetchall()}

            cur.execute("SELECT id, name FROM users ORDER BY id;")
            user_map = {n: i for i, n in cur.fetchall()}

            hyd = str(city_map.get("Hyderabad", 1))
            blr = str(city_map.get("Bangalore", 2))
            mum = str(city_map.get("Mumbai", 3))
            chn = str(city_map.get("Chennai", 4))
            del_ = str(city_map.get("Delhi", 5))

            shiva  = user_map.get("D Shiva", 1)
            arshad = user_map.get("Arshad Khan", 2)
            priya  = user_map.get("Priya Sharma", 3)
            rohan  = user_map.get("Rohan Verma", 4)
            sneha  = user_map.get("Sneha Reddy", 5)

            records = [
                ("Driver",  "2026-06-10", hyd,  shiva,  "K Ramesh Kumar",   "+91 98480 22338", "1234 5678 9012", "TS09 20210045612", "Onboarding",  "Joined",         "Completed documentation. Verified Aadhaar and DL. Assigned Citroen EC3."),
                ("Driver",  "2026-06-11", blr,  arshad, "Sandeep Hegde",    "+91 99000 88221", "2345 6789 0123", "KA03 20198894101", "Onboarding",  "Joined",         "WagonR onboarding done. App installed and first ride completed."),
                ("Partner", "2026-06-12", mum,  priya,  "Milind Salunkhe",  "+91 98200 44556", "3456 7890 1234", "MH01 20150993811", "Enquiry",     "Pending",        "Interested in fleet model (5 cars). Revenue sharing terms requested."),
                ("Driver",  "2026-06-13", hyd,  shiva,  "Mohammad Fareed",  "+91 90001 23456", "4567 8901 2345", "TS11 20220938112", "Support",     "Joined",         "App login issue resolved. Password reset done."),
                ("Driver",  "2026-06-14", hyd,  rohan,  "Anil Konda",       "+91 88866 55443", "5678 9012 3456", "TS08 20183384910", "Onboarding",  "Not Interested", "Left due to minimum daily drive hour requirement."),
                ("Partner", "2026-06-15", blr,  priya,  "Rajesh Patel",     "+91 98765 43210", "6789 0123 4567", "GJ01 20190012345", "Enquiry",     "Joined",         "Fleet partner confirmed. 3 vehicles registered and active."),
                ("Driver",  "2026-06-17", hyd,  arshad, "Suresh Kumar",     "+91 91234 56789", "7890 1234 5678", "TS05 20211234567", "Onboarding",  "Pending",        "Background check in progress. Documents under review."),
                ("Driver",  "2026-06-19", del_, sneha,  "Vikram Singh",     "+91 98888 77766", "8901 2345 6789", "DL01 20178901234", "Onboarding",  "Joined",         "Delhi onboarding complete. Dzire assigned."),
                ("Partner", "2026-06-21", hyd,  priya,  "Anita Reddy",      "+91 99111 22233", "9012 3456 7890", "TS03 20200987654", "Enquiry",     "Pending",        "Follow-up call scheduled for next week."),
                ("Driver",  "2026-06-22", hyd,  shiva,  "Bhaskar Rao",      "+91 90909 08080", "0123 4567 8901", "TS07 20220123456", "Support",     "Joined",         "Payment settlement resolved. All dues cleared."),
                ("Driver",  "2026-06-23", chn,  sneha,  "Pawan Krishnan",   "+91 97777 11122", "1122 3344 5566", "TN22 20191234567", "Onboarding",  "Joined",         "Chennai pilot batch. Hyundai Xcent assigned."),
                ("Partner", "2026-06-24", mum,  rohan,  "Deepak Mehta",     "+91 98001 55667", "7788 9900 1122", "MH04 20160098765", "Enquiry",     "Not Interested", "Concerned about lock-in period. Did not proceed."),
                ("Driver",  "2026-06-25", blr,  arshad, "Ravi Shankar",     "+91 91000 44556", "3344 5566 7788", "KA05 20210056789", "Onboarding",  "Pending",        "Documents submitted. Waiting for police verification."),
                ("Driver",  "2026-06-26", hyd,  shiva,  "Ajay Deshmukh",    "+91 99888 33221", "5566 7788 9900", "TS02 20200765432", "Support",     "Joined",         "Rider rating issue investigated and resolved."),
                ("Partner", "2026-06-26", hyd,  priya,  "Kavitha Nair",     "+91 90123 45678", "6677 8899 0011", "TS06 20181234567", "Enquiry",     "Joined",         "Signed partner agreement. 2 vehicles onboarded."),
            ]

            cur.executemany("""
                INSERT INTO walkins
                  (visitor_type, event_date, city, executive_id, person_name,
                   person_number, aadhaar_number, dl_number, visiting_reason,
                   joined_status, remarks)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s);
            """, records)
            print(f"[OK] Walk-in records seeded ({len(records)} records)")

        conn.commit()
        cur.close()
        print("[OK] Database setup complete")

    except Exception as e:
        print(f"[ERROR] Startup error: {e}")
        conn.rollback()
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────
class WalkinData(BaseModel):
    visitor_type:    Optional[str] = None
    event_date:      Optional[str] = None
    city:            Union[str, int, None] = None
    executive_id:    Union[str, int, None] = None
    person_name:     Optional[str] = None
    person_number:   Union[str, int, None] = None
    aadhaar_number:  Optional[str] = None
    dl_number:       Union[str, int, None] = None
    aadhaar_image:   Optional[Any] = None
    dl_image:        Optional[Any] = None
    visiting_reason: Optional[str] = None
    joined_status:   Optional[str] = None
    remarks:         Optional[str] = None


def extract_image(val: Any) -> Optional[str]:
    """Pull base64 content from SurveyJS file-question format."""
    if val is None:
        return None
    if isinstance(val, list) and len(val) > 0:
        first = val[0]
        return first.get("content") if isinstance(first, dict) else str(first)
    if isinstance(val, str) and val.startswith("data:"):
        return val
    return None



# ─────────────────────────────────────────────────────────
# Executives
# ─────────────────────────────────────────────────────────
@app.get("/api/executives")
def get_all_executives():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name, COALESCE(role,'Executive') FROM users ORDER BY id;")
        rows = cur.fetchall()
        return [{"value": r[0], "text": f"{r[1]}  (ID {r[0]})"} for r in rows]
    finally:
        postgreSQL_pool.putconn(conn)


@app.get("/api/executives/{user_id}")
def get_executive(user_id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT name, COALESCE(role,'Executive') FROM users WHERE id=%s;", (user_id,))
        r = cur.fetchone()
        if r:
            return {"id": user_id, "name": r[0], "role": r[1]}
        raise HTTPException(status_code=404, detail="Executive not found")
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Cities
# ─────────────────────────────────────────────────────────
@app.get("/api/cities")
def get_all_cities():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM cities ORDER BY id;")
        return [{"value": r[0], "text": r[1]} for r in cur.fetchall()]
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Stats
# ─────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM walkins;")
        total = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE joined_status='Joined';")
        joined = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE joined_status='Pending';")
        pending = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE joined_status='Not Interested';")
        not_interested = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE visitor_type='Driver';")
        drivers = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM walkins WHERE visitor_type='Partner';")
        partners = cur.fetchone()[0]
        conversion = round(joined / total * 100, 1) if total > 0 else 0.0
        return {
            "total": total,
            "joined": joined,
            "pending": pending,
            "not_interested": not_interested,
            "drivers": drivers,
            "partners": partners,
            "conversion_rate": conversion,
        }
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — List
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins")
def get_all_walkins():
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                w.id,
                w.visitor_type,
                w.event_date,
                COALESCE(c.name, w.city)   AS city_name,
                w.executive_id,
                COALESCE(u.name, '—')      AS executive_name,
                w.person_name,
                w.person_number,
                w.aadhaar_number,
                w.dl_number,
                w.visiting_reason,
                w.joined_status,
                w.remarks,
                w.created_at
            FROM walkins w
            LEFT JOIN cities c ON c.id::text = w.city::text
            LEFT JOIN users  u ON u.id = w.executive_id
            ORDER BY w.id DESC;
        """)
        cols = [d[0] for d in cur.description]
        result = []
        for row in cur.fetchall():
            d = dict(zip(cols, row))
            if d.get("created_at"):
                d["created_at"] = str(d["created_at"])
            result.append(d)
        return result
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Single
# ─────────────────────────────────────────────────────────
@app.get("/api/walkins/{walkin_id}")
def get_walkin(walkin_id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                w.visitor_type, w.event_date, w.city, w.executive_id,
                w.person_name, w.person_number, w.aadhaar_number, w.dl_number,
                w.visiting_reason, w.joined_status, w.remarks,
                COALESCE(u.name, '') AS executive_name
            FROM walkins w
            LEFT JOIN users u ON u.id = w.executive_id
            WHERE w.id = %s;
        """, (walkin_id,))
        r = cur.fetchone()
        if r:
            return {
                "visitor_type": r[0], "event_date": r[1], "city": r[2],
                "executive_id": r[3], "person_name": r[4], "person_number": r[5],
                "aadhaar_number": r[6], "dl_number": r[7],
                "visiting_reason": r[8], "joined_status": r[9], "remarks": r[10],
                "executive_name": r[11],
            }
        raise HTTPException(status_code=404, detail="Walkin not found")
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Create
# ─────────────────────────────────────────────────────────
@app.post("/api/walkins")
def create_walkin(data: WalkinData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO walkins
              (visitor_type, event_date, city, executive_id, person_name,
               person_number, aadhaar_number, dl_number, aadhaar_image,
               dl_image, visiting_reason, joined_status, remarks)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id;
        """, (
            data.visitor_type,
            data.event_date,
            str(data.city) if data.city is not None else None,
            int(data.executive_id) if data.executive_id else None,
            data.person_name,
            str(data.person_number) if data.person_number else None,
            data.aadhaar_number,
            str(data.dl_number) if data.dl_number else None,
            extract_image(data.aadhaar_image),
            extract_image(data.dl_image),
            data.visiting_reason,
            data.joined_status,
            data.remarks,
        ))
        walkin_id = cur.fetchone()[0]
        conn.commit()
        return {"success": True, "walkin_id": walkin_id}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Update
# ─────────────────────────────────────────────────────────
@app.put("/api/walkins/{walkin_id}")
def update_walkin(walkin_id: int, data: WalkinData):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        # Update images only when new ones are provided
        new_aadhaar = extract_image(data.aadhaar_image)
        new_dl      = extract_image(data.dl_image)
        if new_aadhaar:
            cur.execute("UPDATE walkins SET aadhaar_image=%s WHERE id=%s;", (new_aadhaar, walkin_id))
        if new_dl:
            cur.execute("UPDATE walkins SET dl_image=%s WHERE id=%s;", (new_dl, walkin_id))

        cur.execute("""
            UPDATE walkins SET
                visitor_type=%s, event_date=%s, city=%s, executive_id=%s,
                person_name=%s, person_number=%s, aadhaar_number=%s, dl_number=%s,
                visiting_reason=%s, joined_status=%s, remarks=%s
            WHERE id=%s;
        """, (
            data.visitor_type,
            data.event_date,
            str(data.city) if data.city is not None else None,
            int(data.executive_id) if data.executive_id else None,
            data.person_name,
            str(data.person_number) if data.person_number else None,
            data.aadhaar_number,
            str(data.dl_number) if data.dl_number else None,
            data.visiting_reason,
            data.joined_status,
            data.remarks,
            walkin_id,
        ))
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Walk-ins — Delete
# ─────────────────────────────────────────────────────────
@app.delete("/api/walkins/{walkin_id}")
def delete_walkin(walkin_id: int):
    conn = postgreSQL_pool.getconn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM walkins WHERE id = %s RETURNING id;", (walkin_id,))
        deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="Walkin not found")
        conn.commit()
        return {"success": True}
    finally:
        postgreSQL_pool.putconn(conn)


# ─────────────────────────────────────────────────────────
# Static files — must be last
# ─────────────────────────────────────────────────────────
app.mount("/", StaticFiles(directory=".", html=True), name="static")
