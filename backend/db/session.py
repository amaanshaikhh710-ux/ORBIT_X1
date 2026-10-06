"""
Orbital Twin Database Session & Connection Management
Configured for PostgreSQL on Render and local development fallback.
"""
import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("orbital_twin.db")

@event.listens_for(Engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign key constraints for SQLite connections to match PostgreSQL behavior."""
    if type(dbapi_connection).__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Read database URL from environment
RAW_DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if RAW_DATABASE_URL:
    # Render and cloud providers may inject postgres://, postgresql://, or postgresql+psycopg://
    # Map explicitly to postgresql+psycopg2:// to match installed psycopg2-binary
    if RAW_DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = RAW_DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif RAW_DATABASE_URL.startswith("postgresql+psycopg://"):
        try:
            import psycopg  # noqa: F401
            DATABASE_URL = RAW_DATABASE_URL
        except ImportError:
            DATABASE_URL = RAW_DATABASE_URL.replace("postgresql+psycopg://", "postgresql+psycopg2://", 1)
    elif RAW_DATABASE_URL.startswith("postgresql://") and not RAW_DATABASE_URL.startswith("postgresql+"):
        DATABASE_URL = RAW_DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
    else:
        DATABASE_URL = RAW_DATABASE_URL
    logger.info("Using configured PostgreSQL database connection.")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
    )
else:
    # Local fallback: SQLite database in backend directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_PATH = os.path.join(BASE_DIR, "..", "orbital_twin.db")
    DATABASE_URL = f"sqlite:///{DATABASE_PATH}"
    logger.info("DATABASE_URL not set; using local SQLite storage: %s", DATABASE_URL)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for yielding database sessions with automatic closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initializes tables and seeds initial mission baseline and operator credentials."""
    import backend.db.models as models  # Ensure all models are registered
    import bcrypt
    from datetime import datetime, timezone

    Base.metadata.create_all(bind=engine)

    # Seed baseline users and spacecraft/mission records
    db = SessionLocal()
    try:
        # 1. Seed authoritative 4 Demo Roles + backwards-compatible test accounts
        from backend.api.auth import UserRole
        default_users = [
            ("mission_admin", "admin123", UserRole.MISSION_ADMINISTRATOR.value),
            ("mission_operator", "password123", UserRole.MISSION_OPERATOR.value),
            ("flight_director", "password123", UserRole.FLIGHT_DIRECTOR.value),
            ("simulation_engineer", "password123", UserRole.SIMULATION_ENGINEER.value),
            ("admin", "admin123", UserRole.MISSION_ADMINISTRATOR.value),
            ("operator", "password123", UserRole.MISSION_OPERATOR.value),
            ("flight_controller_1", "password123", UserRole.MISSION_OPERATOR.value),
            ("flight_dir", "securepassword", UserRole.FLIGHT_DIRECTOR.value),
            ("simulation_eng", "password123", UserRole.SIMULATION_ENGINEER.value),
        ]

        for username, plain_pass, role in default_users:
            existing = db.query(models.User).filter_by(username=username).first()
            salt = bcrypt.gensalt()
            pw_hash = bcrypt.hashpw(plain_pass.encode("utf-8"), salt).decode("utf-8")
            if not existing:
                user = models.User(
                    username=username,
                    password_hash=pw_hash,
                    role=role,
                    created_at=datetime.now(timezone.utc),
                )
                db.add(user)
            else:
                # Ensure existing accounts are updated to valid authoritative 4-roles and known demo passwords
                if username in ("mission_admin", "mission_operator", "flight_director", "simulation_engineer", "admin", "operator", "flight_dir", "simulation_eng"):
                    existing.role = role
                    existing.password_hash = pw_hash
                elif existing.role == "System Engineer":
                    existing.role = UserRole.SIMULATION_ENGINEER.value

        db.commit()

        # 2. Seed baseline spacecraft BEFORE inserting mission (dependency-safe)
        existing_sc = db.query(models.SpacecraftModel).filter_by(id="sat-3u-01").first()
        if not existing_sc:
            sc = models.SpacecraftModel(
                id="sat-3u-01",
                name="ORBIT-X1",
                bus_class="3U CubeSat",
                configuration_json="""{
                    "mass_kg": 4.0,
                    "solar_peak_w": 24.0,
                    "battery_capacity_wh": 72.0,
                    "storage_capacity_gb": 64.0,
                    "downlink_rate_mbps": 10.0
                }""",
                created_at=datetime.now(timezone.utc),
            )
            db.add(sc)
            db.commit()

        # 3. Seed baseline mission AFTER spacecraft is committed
        existing_mission = db.query(models.MissionModel).filter_by(id="eo-mission-01").first()
        if not existing_mission:
            mission = models.MissionModel(
                id="eo-mission-01",
                name="Mission ORBIT-X1: Earth Observation",
                spacecraft_id="sat-3u-01",
                status="ACTIVE",
                mission_config_json="""{
                    "target_images": 20,
                    "nominal_orbit_period_s": 5400.0,
                    "ground_station": "Svalbard Ground Station (78.2°N)"
                }""",
                created_at=datetime.now(timezone.utc),
            )
            db.add(mission)
            db.commit()

    except Exception as e:
        db.rollback()
        logger.error("Database initialization failed: %s", e, exc_info=True)
        raise
    finally:
        db.close()
