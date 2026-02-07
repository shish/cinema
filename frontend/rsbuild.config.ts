import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";

const backend = process.env.CINEMA_BACKEND ?? "http://127.0.0.1:2001";
const mqtt = process.env.CINEMA_MQTT ?? "http://127.0.0.1:9001";

export default defineConfig({
    plugins: [pluginReact(), pluginSass()],
    html: {
        title: "Cinema",
        favicon: "src/static/favicon.svg",
        template: "src/static/index.html",
    },
    server: {
        proxy: {
            "/files": { target: backend },
            "/api": { target: backend, ws: true },
            "/mqtt": { target: mqtt, ws: true },
        },
    },
});
