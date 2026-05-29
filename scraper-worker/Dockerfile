# Plain Node image — no browser needed now that scraping is pure fetch().
# This drops the image from ~2GB (Playwright/Chromium) to ~50MB.
# Node 22: undici 8 calls webidl.util.markAsUncloneable, which only exists
# on Node 22+ (Node 20 crashes at require time with "is not a function").
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY *.ts ./

RUN npx tsc

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
