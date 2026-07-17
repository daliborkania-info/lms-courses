# ---------- build stage ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
# better-sqlite3 needs build tools for the native module
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Build without content present; content is read at runtime from volumes
ENV COURSES_DIR=/app/courses
ENV DATA_DIR=/app/data
RUN mkdir -p /app/courses /app/data && npm run build

# ---------- runtime stage ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV COURSES_DIR=/app/courses
ENV DATA_DIR=/app/data
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone output: server + minimal node_modules (incl. better-sqlite3 binary)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN mkdir -p /app/courses /app/data
EXPOSE 3000
CMD ["node", "server.js"]
