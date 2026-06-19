"use client";
import { useEffect } from "react";
import { Workbox } from "workbox-window";

export function PwaRegistry() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isDev = process.env.NODE_ENV === "development";

    // In local/dev, aggressively remove stale SW + cache entries.
    // This prevents broken "unstyled + non-interactive" pages caused by stale precache manifests.
    if (isDev || isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            caches.delete(key);
          });
        });
      }
      return;
    }

    const wb = new Workbox("/sw.js");
    wb.register();
  }, []);
  return null;
}
