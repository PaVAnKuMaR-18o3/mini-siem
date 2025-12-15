FROM python:3.11-slim

# 1. Set the root of the project inside the container
WORKDIR /app

# 2. Copy requirements first (to cache dependencies)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. CRITICAL: Copy the code into a 'backend' subdirectory
# This ensures /app/backend/app.py exists, matching your local structure
COPY . /app/backend

# 4. Tell Python that /app is the root for imports
# This allows "import backend.app" to work perfectly
ENV PYTHONPATH=/app

# 5. Run uvicorn pointing to the package path
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]