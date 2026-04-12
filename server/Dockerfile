FROM node:20-alpine AS base

WORKDIR /app

RUN apk add --no-cache python3 make g++ && \
    apk add --no-cache git && \
    apk add --no-cache curl

COPY package*.json ./
COPY package-lock.json* ./

RUN npm ci

COPY . .

COPY config ./config
COPY middleware ./middleware
COPY models ./models
COPY routes ./routes
COPY services ./services
COPY utils ./utils
COPY public ./public
COPY views ./views
COPY app.js config.json .env.example ./

EXPOSE 3000
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai

CMD ["node", "app.js"]
