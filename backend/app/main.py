import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as aioredis

from app.config import settings
from app.database import engine
from app.routers import admin, audit, auth, dashboard, documents, patients

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medstore")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: test DB connection
    logger.info("Connecting to database...")
    try:
        async with engine.begin() as conn:
            # Simple check
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        logger.info("Database connected successfully.")
        try:
            from app.seed import seed

            await seed()
            logger.info("Seed/bootstrap complete.")
        except Exception as e:
            logger.warning(f"Seed skipped: {e}")
    except Exception as e:
        logger.warning(f"Database connection error at startup: {e}")

    # Startup: test Redis connection
    logger.info("Connecting to Redis...")
    try:
        redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=5,
        )
        await redis_client.ping()
        app.state.redis = redis_client
        logger.info("Redis connected successfully.")
    except Exception as e:
        logger.warning(f"Redis connection error at startup: {e}")
        app.state.redis = None

    yield

    # Shutdown
    logger.info("Shutting down...")
    if getattr(app.state, "redis", None):
        await app.state.redis.aclose()
    await engine.dispose()
    logger.info("Cleanup complete.")


app = FastAPI(
    title="MedStore Clinical Storage API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    db_ok = True
    redis_ok = True

    try:
        async with engine.begin() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
    except Exception:
        db_ok = False

    try:
        if app.state.redis:
            await app.state.redis.ping()
        else:
            redis_ok = False
    except Exception:
        redis_ok = False

    overall_healthy = db_ok and redis_ok
    # Redis only backs token revocation/session blocklist; DB availability is the
    # hard requirement. Report degraded (not an outage) when Redis is unreachable.
    status_code = status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE

    return JSONResponse(
        status_code=status_code,
        content={
            "status": "healthy" if overall_healthy else "degraded",
            "database": "connected" if db_ok else "unreachable",
            "redis": "connected" if redis_ok else "unreachable",
        },
    )


# Routers
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(documents.router)
app.include_router(audit.router)
app.include_router(admin.router)
app.include_router(dashboard.router)
