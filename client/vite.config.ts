import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
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
    viteStaticCopy({
      targets: [
        {
          src: 'public/_redirects', // kaynağın
          dest: '.'                 // build klasörüne kopyala
        }
      ]
    })
  ],
  build: {
    minify: 'terser', // artık terser kullanılacak
    terserOptions: {
      compress: {
        drop_console: false, // build için tüm console.log, debug, info kaldırılmayacak
      },
    },
  },
});
