/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module "file-saver" {
  export function saveAs(data: Blob | File | string, filename?: string, options?: unknown): void;
}

declare module "js-md5" {
  interface Md5 {
    (message: string | number[] | ArrayBuffer | Uint8Array): string;
    hex(message: string | number[] | ArrayBuffer | Uint8Array): string;
  }
  const md5: Md5;
  export default md5;
}

declare module "bootstrap/dist/js/bootstrap.bundle.min.js";
