FROM python:3.12-slim

WORKDIR /app

COPY ingest/tiingo/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ingest/tiingo/ ./

ENTRYPOINT ["python", "ingest.py"]
