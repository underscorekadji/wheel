# Use the official Node.js 20 runtime as base image
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Expose port
EXPOSE 3000

# Start the development server using npx
CMD ["npx", "next", "dev", "-H", "0.0.0.0"]