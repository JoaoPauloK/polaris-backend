# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm ci; \
  fi

# Development stage
FROM base AS dev
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm ci; \
  fi
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm ci; \
  fi
COPY . .
RUN npm run build

# Production stage
FROM base AS production
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* ./
RUN \
  if [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
  else npm ci --only=production; \
  fi
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["npm", "start"]</content>
<parameter name="filePath">/home/joaopaulo/polaris/Dockerfile.backend