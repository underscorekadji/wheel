# Development Dockerfile for Docker Compose
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files  
COPY . .

# Expose port
EXPOSE 3000

# Set development environment
ENV NODE_ENV=development

# Add node_modules/.bin to PATH to ensure next is found
ENV PATH=/app/node_modules/.bin:$PATH

# Start the development server
CMD ["npm", "run", "dev"]
