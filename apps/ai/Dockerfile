# syntax=docker/dockerfile:1
FROM python:3.12-slim AS base
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1

FROM base AS build
COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install --prefix=/install .

FROM base AS runtime
RUN addgroup --system shieldwise && adduser --system --ingroup shieldwise shieldwise
COPY --from=build /install /usr/local
COPY app ./app
USER shieldwise
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" || exit 1
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
