FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy every bot module (bot.py entrypoint + config/strings/backend/helpers/handlers).
COPY *.py .

CMD ["python", "bot.py"]
