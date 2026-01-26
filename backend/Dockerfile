FROM rust:1.87 AS build-backend
COPY Cargo.toml Cargo.lock /app/
WORKDIR /app
RUN mkdir src && echo "fn main() {println!(\"stub\")}" > /app/src/main.rs && cargo build --release && rm -rf src target/release/deps/cinema*
COPY src /app/src
RUN cargo build --release
ENV RUST_LOG=info
CMD ["/app/target/release/cinema"]
