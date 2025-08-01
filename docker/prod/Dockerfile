# Multi-stage build for Next.js application

# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy source code
COPY . .

# Create public directory if it doesn't exist
RUN mkdir -p public

# Build the Next.js application using the installed binary directly
RUN PATH="/app/node_modules/.bin:$PATH" next build

# Stage 2: Production runtime
FROM node:20-slim AS runner
WORKDIR /app

# Create non-root user for security
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/public ./public/

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the production server
CMD ["node", "server.js"]