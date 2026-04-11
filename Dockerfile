FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

EXPOSE 3001

ENV PRIVATE_KEY=0x807aa72bd90119bf8ef49a201ded88326ca2812fc2430f8d1cafff342a707e65
ENV OG_MODEL=anthropic/claude-4.0-sonnet
ENV PORT=3001

CMD ["node", "server.js"]