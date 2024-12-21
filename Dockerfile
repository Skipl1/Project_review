FROM python:3.9-slim

RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && pip install psycopg2-binary \
    && apt-get clean

WORKDIR /app
COPY . /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["python", "app.py"]
