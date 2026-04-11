FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install

COPY backend/ ./

EXPOSE 3001

ENV PORT=3001

CMD ["node", "server.js"]