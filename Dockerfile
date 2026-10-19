FROM node:22-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY package.json ./
COPY index.html style.css app.js api.js config.js manifest.webmanifest icon.svg ./
COPY backend ./backend

EXPOSE 3000

CMD ["node", "backend/src/server.js"]
