# Viggle Studio backend — works on Render, Koyeb, Fly.io, Railway, Cloud Run, or any Docker host.
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
# ffmpeg-static downloads the ffmpeg binary during install (needed for story stitching)
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/output
ENV PORT=3000
ENV OUTPUT_DIR=/app/output
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
