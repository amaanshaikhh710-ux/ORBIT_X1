import os
import sys
import tempfile
import pytest

# Ensure isolated test database for all pytest executions
TEST_DB_PATH = os.path.join(tempfile.gettempdir(), "test_orbital_twin.db")
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    from backend.db.session import init_db, engine, Base
    init_db()
    yield
    # Cleanup after test session
    try:
        Base.metadata.drop_all(bind=engine)
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)
    except Exception:
        pass
