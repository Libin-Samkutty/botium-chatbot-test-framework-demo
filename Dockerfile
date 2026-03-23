# Multi-stage build for optimized production image
FROM node:20-slim as base

# Set build arguments and environment
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV} \
    NPM_CONFIG_LOGLEVEL=warn \
    PATH=/app/node_modules/.bin:$PATH

WORKDIR /app

# Create non-root user for security
RUN groupadd -r botium && useradd -r -g botium botium

# Install minimal system dependencies (python for some tools, curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Production stage
FROM base as production

WORKDIR /app

# Copy package files for dependency installation
COPY --chown=botium:botium package*.json ./

# Install Node dependencies with production flag
RUN npm ci --only=production && \
    npm cache clean --force

# Copy project files
COPY --chown=botium:botium . .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Switch to non-root user
USER botium

# Expose port (Redis runs separately in docker-compose)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Run inbound proxy by default
CMD ["npm", "run", "inbound"]


# Development stage (optional - for local development with hot reload)
FROM base as development

WORKDIR /app

# Copy package files
COPY --chown=botium:botium package*.json ./

# Install all dependencies (dev + prod)
RUN npm ci && \
    npm cache clean --force

# Copy project files
COPY --chown=botium:botium . .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Switch to non-root user
USER botium

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Run tests in development
CMD ["npm", "test"]
