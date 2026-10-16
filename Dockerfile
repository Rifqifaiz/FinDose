# FinDose - satu container untuk frontend + API (SQLite di volume /data)
# Build dari root project:  docker build -t findose .
FROM node:26-slim

WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    FINDOSE_DB=/data/findose.db

# Hanya file yang memang dipakai aplikasi (lihat juga .dockerignore)
COPY index.html style.css app.js api.js config.js manifest.webmanifest icon.svg ./
COPY backend/package.json ./backend/
COPY backend/src ./backend/src

RUN mkdir -p /data
VOLUME /data
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/backend
CMD ["node", "src/server.js"]
