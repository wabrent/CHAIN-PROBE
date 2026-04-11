FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

WORKDIR /app
COPY index.html ./
COPY backend/ ./backend/
COPY backend/package*.json ./

EXPOSE 3001

ENV PORT=3001

CMD ["node", "backend/server.js"]