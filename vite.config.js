import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "/_txt_/",
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: "QuestionJSON", dest: "." },
        { src: "IMAG", dest: "." },
        { src: "TTF", dest: "." },
        { src: "CNAME", dest: "." }
      ]
    })
  ],
  server: {
    port: 5173
  }
});
