import { defineConfig } from "@rsbuild/core";
import { pluginReact } from "@rsbuild/plugin-react";
import { pluginSass } from "@rsbuild/plugin-sass";

const backend = process.env.BACKEND ?? "http://127.0.0.1:2001";

export default defineConfig({
    plugins: [pluginReact(), pluginSass()],
    source: {
        entry: { index: "./frontend/index.tsx" },
    },
    html: {
        title: "Cinema",
        favicon: "frontend/static/favicon.svg",
        template: "frontend/static/index.html",
    },
    server: {
        proxy: {
            "/files": { target: backend },
            "/api": { target: backend, ws: true },
        },
    },
});
