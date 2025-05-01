# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy dependency files first to leverage caching
COPY package*.json ./

RUN npm ci

# Copy source code and configuration files
COPY tsconfig.json ./
COPY src/ ./src/

# Build the project
RUN npm run build

# Runtime stage
FROM node:20-slim AS runner

# Install system dependencies required for runtime
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Playwright configuration
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npx playwright install-deps chromium
RUN npx playwright install chromium

WORKDIR /app

# Copy only production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy build artifacts from the builder stage
COPY --from=builder /app/build ./build

# Expose port
EXPOSE 3000

# Startup command
CMD ["node", "build/index.js", "--transport=http", "--host=0.0.0.0", "--port=3000"] 