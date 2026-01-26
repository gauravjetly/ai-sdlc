# AI-SDLC Control Center Dashboard - Dockerfile
# Multi-stage build for optimized production container

FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Add labels for metadata
LABEL maintainer="AI-SDLC Framework"
LABEL description="AI-SDLC Control Center Dashboard"
LABEL version="2.4.0"

# Copy dashboard files
COPY server.js ./
COPY index.html ./
COPY start-dashboard.sh ./
COPY memory-api.js ./
COPY sdlc-control-center.jsx ./
COPY assets/ ./assets/

# Make scripts executable
RUN chmod +x server.js start-dashboard.sh

# Create a non-root user for security
RUN addgroup -g 1001 -S sdlc && \
    adduser -S sdlc -u 1001 -G sdlc && \
    chown -R sdlc:sdlc /app

# Switch to non-root user
USER sdlc

# Expose the dashboard port
EXPOSE 3030

# Health check to monitor container status
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3030/api/registry', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Set environment variables
ENV NODE_ENV=production \
    PORT=3030

# Start the server directly
CMD ["node", "server.js"]
