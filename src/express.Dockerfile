# syntax=docker/dockerfile:1
FROM node:22.9.0-alpine AS base

LABEL maintainer="TrentonYo"

# Install pnpm and dependencies required for Prisma
RUN apk add --no-cache libc6-compat \
    && npm install -g pnpm

WORKDIR /usr/src/app

COPY ./package*.json ./
COPY ./pnpm-lock.yaml ./
COPY ./tsconfig.json ./
RUN pnpm install

COPY ./src ./src
COPY ./prisma ./prisma

RUN pnpx prisma generate
RUN pnpm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
