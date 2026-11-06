import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

const APP_VERSION = '1.0.0';

function versionQueryPlugin(): Plugin {
  return {
    name: 'version-query-plugin',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(/(<script\b[^>]*src=["'])([^"']+)(["'][^>]*>)/gi, (match, prefix, src, suffix) => {
        if (src.includes('?')) return match;
        return `${prefix}${src}?v=${APP_VERSION}${suffix}`;
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), versionQueryPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
