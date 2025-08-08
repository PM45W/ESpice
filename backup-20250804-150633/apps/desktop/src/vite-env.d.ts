/// <reference types="vite/client" />

// Tauri API types
declare global {
  interface Window {
    __TAURI__?: {
      invoke: (cmd: string, args?: any) => Promise<any>;
      [key: string]: any;
    };
  }
}

export {};
