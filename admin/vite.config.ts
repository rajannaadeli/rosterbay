import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

import { APK_DOWNLOAD_PATH, APK_RELEASE_URL } from "./src/lib/release-target"

/**
 * `/download/worker-app.apk` is the branded, permanent URL the landing page
 * links to; in production Vercel redirects it to the GitHub release asset
 * (see `vercel.json` — keep the two in step). The dev server has no such
 * config, so without this the link 404s into the SPA fallback on localhost
 * and looks broken on the very page that owns it.
 */
function apkDownloadRedirect(): Plugin {
  return {
    name: "rosterbay:apk-download-redirect",
    configureServer(server) {
      server.middlewares.use(APK_DOWNLOAD_PATH, (_req, res) => {
        res.writeHead(302, { Location: APK_RELEASE_URL })
        res.end()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), apkDownloadRedirect()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
