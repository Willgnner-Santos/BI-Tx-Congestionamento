FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app

ARG DATABASE_URL="postgres://dummy:5432/db"
ARG DATABASE_SSL="false"
ARG ALERT_THRESHOLD="60"

ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_SSL=$DATABASE_SSL
ENV ALERT_THRESHOLD=$ALERT_THRESHOLD

COPY --from=deps /app/node_modules ./node_modules
COPY . ./
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

ARG DATABASE_URL="postgres://dummy:5432/db"
ARG DATABASE_SSL="false"
ARG ALERT_THRESHOLD="60"

ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_SSL=$DATABASE_SSL
ENV ALERT_THRESHOLD=$ALERT_THRESHOLD

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]


