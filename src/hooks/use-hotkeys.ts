"use client";

import { useEffect } from "react";

interface HotkeyOptions {
  /** Also fire when focus is inside an input/textarea/select. */
  allowInInputs?: boolean;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable || tag === "SELECT";
}

/**
 * Registers a single keyboard shortcut, e.g. useHotkeys("mod+k", openPalette).
 * "mod" maps to Cmd on macOS and Ctrl elsewhere.
 */
export function useHotkeys(combo: string, handler: (event: KeyboardEvent) => void, options: HotkeyOptions = {}) {
  useEffect(() => {
    const parts = combo.toLowerCase().split("+");
    const key = parts[parts.length - 1];
    const needsMod = parts.includes("mod");
    const needsShift = parts.includes("shift");
    const needsAlt = parts.includes("alt");

    function onKeyDown(event: KeyboardEvent) {
      if (!options.allowInInputs && isEditableTarget(event.target)) return;
      if (event.key.toLowerCase() !== key) return;
      if (needsMod && !(event.metaKey || event.ctrlKey)) return;
      if (!needsMod && (event.metaKey || event.ctrlKey)) return;
      if (needsShift !== event.shiftKey) return;
      if (needsAlt !== event.altKey) return;

      event.preventDefault();
      handler(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [combo, handler, options.allowInInputs]);
}
