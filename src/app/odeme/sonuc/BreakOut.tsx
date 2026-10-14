"use client";

import { useEffect } from "react";

/** PayTR dönüş sayfası iframe içinde açılır; sayfanın tamamına taşı. */
export function BreakOut() {
  useEffect(() => {
    if (window.top && window.top !== window.self) window.top.location.href = window.location.href;
  }, []);
  return null;
}
