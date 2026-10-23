import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const repositoryName = env.GITHUB_REPOSITORY?.split('/')[1];
  const proxyOptions = {
    target: env.VITE_BACKEND_URL || 'http://localhost:8000',
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyRequest, request) => {
        if (request.headers.host) {
          proxyRequest.setHeader('x-forwarded-host', request.headers.host);
        }
        proxyRequest.setHeader(
          'x-forwarded-proto',
          request.headers['x-forwarded-proto'] ||
            (request.socket.encrypted ? 'https' : 'http'),
        );
      });
    },
  };

  return {
    base: repositoryName ? `/${repositoryName}/` : '/',
    plugins: [react()],
    server: {
      host: env.VITE_HOST || '0.0.0.0',
      port: Number(env.VITE_PORT || '5174'),
      strictPort: true,
      allowedHosts: ['cyberguard.home.arpa'],
      proxy: {
        '/auth': proxyOptions,
        '/api': proxyOptions,
      },
    },
  };
});
