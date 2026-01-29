FROM node:20-alpine

# Install build tools for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3001
ENV PORT=3001

# Seed DB on first run, then start server
CMD node dist/db/seed.js && node dist/index.js
