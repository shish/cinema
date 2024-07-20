import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';
import { pluginSvgr } from '@rsbuild/plugin-svgr';

export default defineConfig({
    plugins: [
        pluginReact(),
        pluginSass(),
        pluginSvgr({ svgrOptions: { svgProps: { width: '1em', height: '1em' } } }),
    ],
    html: {
        title: 'Cinema',
        favicon: 'src/static/favicon.svg',
        // template: 'src/static/index.html',
    },
    server: {
        proxy: {
            '/movies': { target: 'https://cinema.shish.io' },
            '/rooms': { target: 'https://cinema.shish.io' },
            '/room': {
                target: 'https://cinema.shish.io',
                ws: true,
            },
        },
    },
});
