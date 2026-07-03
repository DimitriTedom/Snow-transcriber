"use client";

import { useEffect } from "react";

/**
 * Dev fallback: when Next.js runs from a subst drive (S:), the SSR head
 * sometimes omits the layout.css link. This ensures styles load immediately.
 */
export function CssBootstrap() {
  useEffect(() => {
    const hasStylesheet = document.querySelector('link[rel="stylesheet"][href*="layout.css"]');
    if (hasStylesheet) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/_next/static/css/app/layout.css";
    link.setAttribute("data-css-bootstrap", "true");
    document.head.appendChild(link);
  }, []);

  return null;
}