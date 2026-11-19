import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 見本のページ。npm の部品の代わりに、このリポジトリの src/ をそのまま使う（公開前でも試せる）
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  resolve: {
    alias: [{ find: '@shiodome47/youtube-player', replacement: fileURLToPath(new URL('../../src/index.ts', import.meta.url)) }],
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
