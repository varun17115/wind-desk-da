# Stage 1: Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Static Asset Server
FROM python:3.11-slim
WORKDIR /app

# Install system tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application and data
COPY backend/ ./backend/

# Copy compiled frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default environment configuration
ENV PORT=8000
EXPOSE 8000

# Container Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Launch FastAPI web application
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
