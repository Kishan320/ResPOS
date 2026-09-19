import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings


def get_engine_connect_args() -> dict:
    args = {
        "connect_timeout": 10,
        "charset": "utf8mb4",
    }
    if settings.db_ssl or "tidbcloud.com" in settings.db_host:
        ssl_dict = {}
        if settings.db_ssl_ca and os.path.exists(settings.db_ssl_ca):
            ssl_dict["ca"] = settings.db_ssl_ca
        args["ssl"] = ssl_dict
    return args


engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=settings.db_pool_recycle,
    pool_timeout=30,
    echo=False,
    future=True,
    connect_args=get_engine_connect_args(),
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
    tmp_engine = create_engine(
        url_without_db,
        isolation_level="AUTOCOMMIT",
        connect_args=get_engine_connect_args(),
    )
    with tmp_engine.connect() as conn:
        conn.execute(
            text(
                f"CREATE DATABASE IF NOT EXISTS `{settings.db_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        )
    tmp_engine.dispose()
