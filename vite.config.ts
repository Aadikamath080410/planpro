import path from 'path';
import react from '@vitejs/plugin-react' // or your specific framework plugin
import mkcert from 'vite-plugin-mkcert'
import { defineConfig, loadEnv } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // https: true as any,
      allowedHosts:true
    },
    plugins: [
      react()
    ],
    assetsInclude: ['**/*.glb', '**/*.obj'],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});

