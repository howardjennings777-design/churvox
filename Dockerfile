FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

ENV MALLOC_ARENA_MAX=2 \
    MALLOC_TRIM_THRESHOLD_=65536

EXPOSE 8080

CMD ["uvicorn", "churvox_runtime:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1", "--limit-concurrency", "16", "--backlog", "64", "--timeout-keep-alive", "5"]
