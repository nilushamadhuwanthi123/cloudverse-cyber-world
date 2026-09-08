import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// `base` is the sub-path GitHub Pages serves this project from
// (https://<user>.github.io/cloudverse-cyber-world/). It only applies to the
// production build; the dev server keeps serving from the root, so local
// development is unaffected.
export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/cloudverse-cyber-world/' : '/',
  plugins: [react()],
})
