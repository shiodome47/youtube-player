import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  external: ['react', 'react/jsx-runtime'],
  // Next.js の App Router でも、そのまま使えるように（この部品はブラウザで動く）
  banner: { js: "'use client'" },
})
