# Use official Python 3.11 slim image
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
# Explicitly install OpenAI package to ensure it's available
RUN pip install --no-cache-dir openai>=1.0.0

# Copy the entire app folder into the container
# Copy Docker-specific env file and make it more visible in the container logs
RUN echo "Setting up OpenAI environment for container..."
COPY .env.docker /app/.env

# Copy the app code
COPY ./app ./app

# Expose FastAPI port
EXPOSE 8000

# Start FastAPI with uvicorn (dev mode)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
