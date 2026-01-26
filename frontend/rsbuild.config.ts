import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";

const backend = process.env.CINEMA_BACKEND ?? "http://127.0.0.1:2001";

export default defineConfig({
    plugins: [pluginReact(), pluginSass()],
    source: {
        entry: { index: "./src/index.tsx" },
    },
    html: {
        title: "Cinema",
        favicon: "src/static/favicon.svg",
        template: "src/static/index.html",
    },
    server: {
        proxy: {
            "/robots.txt": { target: backend },
            "/files": { target: backend },
            "/api": { target: backend, ws: true },
        },
    },
});
