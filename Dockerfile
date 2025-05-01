FROM node:20-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies required by Playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npx playwright install-deps chromium

# Set working directory
WORKDIR /app

# Copy project files
COPY package*.json ./
COPY pnpm-lock.yaml ./
COPY tsconfig.json ./

# Install project dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy source code
COPY src/ ./src/

# Build project
RUN pnpm run build

# Install browser
RUN npx playwright install chromium

# Expose service port
EXPOSE 3000

# Set startup command
CMD ["node", "build/index.js", "--transport=http", "--host=0.0.0.0", "--port=3000"] 