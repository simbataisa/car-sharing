"use client";

import { useEffect, useRef } from "react";

// Skip navigation component for accessibility
export function SkipNavigation() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
    >
      Skip to main content
    </a>
  );
}

// Focus trap utility for modals and menus
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        const closeButton = container.querySelector(
          "[data-close]"
        ) as HTMLElement;
        closeButton?.click();
      }
    };

    document.addEventListener("keydown", handleTabKey);
    document.addEventListener("keydown", handleEscapeKey);
    firstElement?.focus();

    return () => {
      document.removeEventListener("keydown", handleTabKey);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isActive]);

  return containerRef;
}

// Keyboard navigation hook
export function useKeyboardNavigation() {
  const handleKeyDown = (event: React.KeyboardEvent, onAction?: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAction?.();
    }
  };

  return { handleKeyDown };
}

// Screen reader announcements
export function announceToScreenReader(message: string) {
  const announcement = document.createElement("div");
  announcement.setAttribute("aria-live", "polite");
  announcement.setAttribute("aria-atomic", "true");
  announcement.setAttribute("class", "sr-only");
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}
