FROM node:22-alpine

# Install Chromium and dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init \
    udev \
    ttf-liberation \
    font-noto-emoji \
    fontconfig

# Create and set working directory
WORKDIR /app

# Add a non-root user and setup Chrome directories
RUN addgroup -S pptruser && adduser -S -G pptruser pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && mkdir -p /app/.chrome/tmp \
    && mkdir -p /app/.chrome/data \
    && mkdir -p /app/.cache/puppeteer \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Change to non-root user
USER pptruser

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_DISABLE_DEV_SHM_USAGE=true \
    CHROME_PATH=/usr/bin/chromium-browser \
    CHROME_DEVEL_SANDBOX=/usr/local/sbin/chrome-devel-sandbox \
    PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Copy package files with correct ownership
COPY --chown=pptruser:pptruser package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application with correct ownership
COPY --chown=pptruser:pptruser . .

# Build the application
RUN npm run build

# Set production environment after build
ENV NODE_ENV=production

# Expose the port
EXPOSE 8080
ENV HOST=0.0.0.0

# Use dumb-init to handle zombie processes
ENTRYPOINT ["dumb-init", "--"]

# Start the app
CMD ["node", "dist/server/entry.mjs"]