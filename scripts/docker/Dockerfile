# JMF Hosting Discord Bot
# © 2025 JMFHosting. All Rights Reserved.
# Developed by Nanaimo2013 (https://github.com/Nanaimo2013)

FROM node:18-alpine

# Add labels for GitHub Container Registry
LABEL org.opencontainers.image.source="https://github.com/Nanaimo2013/Jmf-Bot"
LABEL org.opencontainers.image.description="JMF Hosting Discord Bot"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="JMFHosting"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2025-03-09"
LABEL org.opencontainers.image.authors="Nanaimo2013"

# Create app directory
WORKDIR /usr/src/app

# Install dependencies required for canvas and other native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy package files
COPY package*.json ./

# Install dependencies with clean cache to reduce image size
RUN npm ci --only=production && npm cache clean --force

# Bundle app source
COPY . .

# Create logs directory and set permissions
RUN mkdir -p logs && chmod 777 logs

# Set environment variables
ENV NODE_ENV=production

# Expose port for potential API
EXPOSE 3000

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "try { require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1)); } catch (e) { process.exit(1); }"

# Start the bot
CMD [ "node", "src/index.js" ] 