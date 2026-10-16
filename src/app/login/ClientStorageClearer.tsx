"use client";

import { useEffect } from "react";

export default function ClientStorageClearer() {
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("cbt_")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error("Failed to clear local storage:", e);
    }
  }, []);

  return null;
}
