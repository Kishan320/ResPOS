"""Database engine and session factory - tuned for high concurrency."""

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=settings.db_pool_recycle,
    pool_timeout=30,
    echo=False,
    future=True,
    connect_args={
        "connect_timeout": 10,
        "charset": "utf8mb4",
    },
)


@event.listens_for(engine, "connect")
def set_mysql_pragmas(dbapi_connection, connection_record):
    """Session-level MySQL tuning for throughput."""
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'")
        cursor.execute("SET SESSION time_zone = '+00:00'")
    finally:
        cursor.close()


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)


class Base(DeclarativeBase):
    pass


def ensure_database_exists() -> None:
    """Create the database if it does not exist (idempotent)."""
    from urllib.parse import quote_plus

    user = quote_plus(settings.db_user)
    password = quote_plus(settings.db_password)
    url_without_db = (
        f"mysql+pymysql://{user}:{password}"
        f"@{settings.db_host}:{settings.db_port}/?charset=utf8mb4"
    )
    tmp_engine = create_engine(url_without_db, isolation_level="AUTOCOMMIT")
    with tmp_engine.connect() as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{settings.db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
    tmp_engine.dispose()
