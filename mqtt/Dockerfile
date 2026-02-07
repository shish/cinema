FROM eclipse-mosquitto:2.0
EXPOSE 1883 9001
VOLUME /mosquitto/data

COPY mosquitto.conf /mosquitto/config/mosquitto.conf
COPY tcp.acl /mosquitto/config/tcp.acl
COPY ws.acl /mosquitto/config/ws.acl

RUN chown -R mosquitto:mosquitto /mosquitto/config/ && \
    chmod 600 /mosquitto/config/*.acl

USER mosquitto
