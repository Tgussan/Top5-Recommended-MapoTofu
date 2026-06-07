import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // GitHub PagesのURLが https://<username>.github.io/<repo>/ の場合は '/<repo>/' に書き換え
  base: './', 
})
