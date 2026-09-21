# Sagar-Drishti API — production image
# Builds only the FastAPI service (no Streamlit, no GDAL/torch toolchain).
# See docker-compose.yml for the Postgres-backed runtime.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app

WORKDIR /app

COPY requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt

COPY alembic.ini .
COPY migrations ./migrations
COPY api ./api
COPY core ./core
COPY data ./data

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]