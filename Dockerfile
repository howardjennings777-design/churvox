FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

EXPOSE 8080

CMD ["sh", "-c", "python -c \"from pathlib import Path;p=Path('server.py');s=p.read_text();s=s.replace(chr(123)+\\\"f' for \\\"+chr(123)+\\\"hydrated.get('amount_due')\\\"+chr(125)+\\\"' if hydrated.get('amount_due') else ''\\\"+chr(125), chr(123)+\\\"' for ' + hydrated.get('amount_due') if hydrated.get('amount_due') else ''\\\"+chr(125));s=s.replace(chr(123)+\\\"f' for \\\"+chr(123)+\\\"hydrated.get('total')\\\"+chr(125)+\\\"' if hydrated.get('total') else ''\\\"+chr(125), chr(123)+\\\"' for ' + hydrated.get('total') if hydrated.get('total') else ''\\\"+chr(125));p.write_text(s)\" && uvicorn server:app --host 0.0.0.0 --port 8080"]
