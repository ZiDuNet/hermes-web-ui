#!/usr/bin/env node
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const command = process.argv[2]

if (!command || command === 'start' || command === 'dev') {
  const { createServer } = await import('vite')
  const vue = await import('@vitejs/plugin-vue')
  const server = await createServer({
    root: projectRoot,
    configFile: resolve(projectRoot, 'vite.config.ts'),
    server: {
      host: true,
      port: 8648,
    },
    plugins: [vue.default()],
  })
  await server.listen()
  server.printUrls()
} else if (command === 'build') {
  const { build } = await import('vite')
  const vue = await import('@vitejs/plugin-vue')
  await build({
    root: projectRoot,
    configFile: resolve(projectRoot, 'vite.config.ts'),
    plugins: [vue.default()],
  })
} else {
  console.log('Usage: hermes-web-ui [command]')
  console.log()
  console.log('Commands:')
  console.log('  start    Start dev server (default)')
  console.log('  build    Build for production')
}
