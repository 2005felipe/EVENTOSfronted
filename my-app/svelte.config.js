import adapterAuto from '@sveltejs/adapter-auto';
import adapterStatic from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const esMovil = process.env.BUILD_TARGET === 'mobile' && !process.env.VERCEL;

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),
    kit: {
        adapter: esMovil
            ? adapterStatic({ fallback: 'index.html' })
            : adapterAuto()
    }
};

export default config;