import "./style.css";
import { ViteSSG } from "vite-ssg";
import App from "./App.vue";
import routes from "./router";

export const createApp = ViteSSG(
  App,
  { routes, base: import.meta.env.BASE_URL },
  async ({ router, isClient }) => {
    if (isClient) {
      await import("bootstrap/dist/js/bootstrap.bundle.min.js");
    }
    if (isClient) {
      router.afterEach((to) => {
        document.title = to.meta?.title || "_txt_";
        const description = document.querySelector('meta[name="description"]');
        const canonical = document.querySelector("link[rel='canonical']");
        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (description && to.meta?.description) {
          description.setAttribute("content", to.meta.description);
        }
        if (canonical) canonical.setAttribute("href", `https://redcrazyghost.github.io${import.meta.env.BASE_URL}${to.path.replace(/^\//, "")}`);
        if (ogUrl) ogUrl.setAttribute("content", `https://redcrazyghost.github.io${import.meta.env.BASE_URL}${to.path.replace(/^\//, "")}`);
      });
    }
  }
);
