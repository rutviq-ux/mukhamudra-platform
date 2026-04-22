FROM listmonk/listmonk:latest

# Copy production config
COPY config.toml /etc/listmonk/config.toml

CMD ["./listmonk", "--config", "/etc/listmonk/config.toml"]
