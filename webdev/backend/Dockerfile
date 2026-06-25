FROM python:3.12-slim

WORKDIR /app

# Install dependencies first (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

EXPOSE 4001

# 4 workers × 2 threads = 8 concurrent request slots.
# gthread worker class: async I/O wait within a thread while GIL releases for DB/network.
# max-requests=1000 recycles workers to prevent slow memory growth over long uptimes.
CMD ["gunicorn", "server:app", \
     "--bind", "0.0.0.0:4001", \
     "--workers", "4", \
     "--threads", "2", \
     "--worker-class", "gthread", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--keep-alive", "5", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100"]
