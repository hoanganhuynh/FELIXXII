import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // bind 0.0.0.0 so a LAN device / tunnel can reach it
    // Same-origin proxy to the local Supabase stack.
    //
    // Why: this is a static SPA that talks to Supabase directly. If the client
    // pointed at http://127.0.0.1:54321, a visitor opening a shared link would
    // resolve that to THEIR OWN machine and get nothing. Proxying under the
    // app's own origin means one tunnel exposes both the app and its API, and
    // the client never needs to know the public hostname.
    proxy: {
      "/supabase": {
        target: "http://127.0.0.1:54321",
        changeOrigin: true,
        ws: true, // realtime
        rewrite: (p) => p.replace(/^\/supabase/, ""),
      },
    },
    // trycloudflare hostnames are random per run
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".loca.lt"],
  },
});
