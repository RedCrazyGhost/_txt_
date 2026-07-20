import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "/",
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: "QuestionJSON", dest: "." },
        { src: "CNAME", dest: "." }
      ]
    })
  ],
  server: {
    port: 5173
  },
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"]
  }
});
