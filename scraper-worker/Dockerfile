FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY *.ts ./

RUN npx tsc

RUN npx playwright install chromium --with-deps

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
