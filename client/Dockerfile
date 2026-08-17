# Lunova Client (danışan) Frontend - Development Dockerfile
# Vite dev server'ı container içinde çalıştırır; docker-compose.yml source
# kodunu bind-mount ettiği için hot-reload çalışır.

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5174

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5174"]
