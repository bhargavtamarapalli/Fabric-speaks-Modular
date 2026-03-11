"use client";
import { useEffect } from "react";
import { Workbox } from "workbox-window";

export function PwaRegistry() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV !== "development") {
      const wb = new Workbox("/sw.js");
      wb.register();
    }
  }, []);
  return null;
}
