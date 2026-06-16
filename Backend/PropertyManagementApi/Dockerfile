# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

ENV PATH=/root/.dotnet/tools:$PATH

COPY ["Domain/Domain.csproj", "Domain/"]
COPY ["Application/Application.csproj", "Application/"]
COPY ["Infrastructure/Infrastructure.csproj", "Infrastructure/"]
COPY ["API/API.csproj", "API/"]

RUN dotnet restore "API/API.csproj"

COPY . .
WORKDIR /src/API
RUN dotnet publish "API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build a framework-dependent EF migration bundle so the runtime image does not need the SDK.
RUN dotnet tool install --global dotnet-ef --version 8.0.13 \
 && dotnet ef migrations bundle \
  --project ../Infrastructure/Infrastructure.csproj \
  --startup-project API.csproj \
  --configuration Release \
  --output /app/publish/efbundle

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Defaults: app listens on 8080 and DB host defaults to 'mysql' for compose setups
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DB_HOST=mysql \
    DB_PORT=3306 \
    RUN_MIGRATIONS=true

# Install small utilities and gosu for privilege drop
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl netcat-openbsd gosu \
 && rm -rf /var/lib/apt/lists/*

# Create non-root user and app directories
RUN (id -u app >/dev/null 2>&1 || useradd --create-home --shell /bin/bash app) \
 && mkdir -p /app/logs /app/uploads \
 && chown -R app:app /app /app/logs /app/uploads

EXPOSE 8080

# Copy published app
COPY --from=build /app/publish .

# Entrypoint: wait for DB, run migrations (optional), then start the app as non-root
RUN cat > /usr/local/bin/entrypoint.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

# Helper: wait for host:port
wait_for_port() {
  host="$1"
  port="$2"
  timeout=${3:-60}
  echo "Waiting for ${host}:${port} (timeout ${timeout}s)..."
  while ! nc -z "$host" "$port"; do
    timeout=$((timeout-1))
    if [ "$timeout" -le 0 ]; then
      echo "Timed out waiting for ${host}:${port}"
      return 1
    fi
    sleep 1
  done
  return 0
}

# If DB_HOST is set, wait for it to be reachable
if [ -n "${DB_HOST:-}" ]; then
  if ! wait_for_port "${DB_HOST}" "${DB_PORT:-3306}" 60; then
    echo "Database ${DB_HOST}:${DB_PORT} not reachable, exiting."
    exit 1
  fi
fi

# Ensure directories exist and correct ownership
mkdir -p /app/uploads /app/logs
chown -R app:app /app/uploads /app/logs

# Optionally run EF Core migrations
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running EF Core migrations..."
  if ./efbundle; then
    echo "Migrations applied successfully."
  else
    echo "Migrations failed. Exiting."
    exit 1
  fi
else
  echo "RUN_MIGRATIONS is false; skipping migrations."
fi

# Start the app as non-root user
exec gosu app dotnet API.dll
EOF

RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
