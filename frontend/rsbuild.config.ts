import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

const backend = process.env.BACKEND ?? 'http://127.0.0.1:8074';

export default defineConfig({
    plugins: [pluginReact(), pluginSass(), pluginSvgr({ svgrOptions: { svgProps: { width: '1em', height: '1em' } } })],
    html: {
        title: 'Cinema',
        favicon: 'src/static/favicon.svg',
        // template: 'src/static/index.html',
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
