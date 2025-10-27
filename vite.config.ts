import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  server: {
    port: 5174, // Client frontend için farklı port
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  build: {
    minify: 'terser', // artık terser kullanılacak
    terserOptions: {
      compress: {
        drop_console: true, // build için tüm console.log, debug, info kaldırılır
      },
    },
  },
});
