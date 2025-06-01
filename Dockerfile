# output frontend code in /app/dist
FROM node:22 AS build-frontend
COPY package.json package-lock.json /app/
WORKDIR /app
RUN npm install
COPY frontend /app
RUN npm run build

# output backend code in /app/target
FROM rust:1.87 AS build-backend
COPY Cargo.toml Cargo.lock /app/
WORKDIR /app
RUN mkdir src && echo "fn main() {println!(\"stub\")}" > /app/backend/main.rs && cargo build --release && rm -rf src target/release/deps/cinema*
COPY backend /app/backend
RUN cargo build --release

# copy to /app/backend and /app/frontend
FROM debian:stable-slim
EXPOSE 8074
#HEALTHCHECK --interval=1m --timeout=3s CMD curl --fail http://127.0.0.1:8074/ || exit 1
#RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
COPY --from=build-backend /app/target/release/cinema /app/backend/
COPY --from=build-frontend /app/dist /app/frontend/dist/

WORKDIR /app/backend
ENV RUST_LOG=info
CMD ["/app/backend/cinema"]
