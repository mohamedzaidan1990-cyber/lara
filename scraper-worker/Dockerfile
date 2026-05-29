# Plain Node image — no browser needed now that scraping is pure fetch().
# This drops the image from ~2GB (Playwright/Chromium) to ~50MB.
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY *.ts ./

RUN npx tsc

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
