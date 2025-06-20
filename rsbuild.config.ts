import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

const backend = process.env.BACKEND ?? 'http://127.0.0.1:8074';

export default defineConfig({
    plugins: [pluginReact(), pluginSass(), pluginSvgr({ svgrOptions: { svgProps: { width: '1em', height: '1em' } } })],
    source: {
        entry: { index: './frontend/index.tsx' },
    },
    html: {
        title: 'Cinema',
        favicon: 'frontend/static/favicon.svg',
        // template: 'frontend/static/index.html',
    },
    server: {
        proxy: {
            '/movies': { target: backend },
            '/rooms': { target: backend },
            '/time': { target: backend },
            '/room': { target: backend, ws: true },
        },
    },
});
