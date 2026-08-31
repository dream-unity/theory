import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    {
      name: 'serve-app-as-index',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url ?? ''
          if (url === '/' || url === '/index.html') req.url = '/app.html'
          next()
        })
      },
    },
  ],
  base: command === 'serve' ? '/' : '/theory/',
  server: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: 'app.html',
    },
    sourcemap: true,
    target: 'es2022',
  },
}))
