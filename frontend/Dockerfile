FROM node:24 AS build-frontend
COPY package.json package-lock.json rsbuild.config.ts tsconfig.json /app/
WORKDIR /app
RUN npm install
COPY src /app/src
RUN npm run build
ENV CINEMA_BACKEND=http://backend:2001 CINEMA_MQTT=http://mqtt:9001
CMD ["npm", "run", "preview"]
