FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8080

CMD ["uvicorn", "churvox_outreach_boot:app", "--host", "0.0.0.0", "--port", "8080"]
