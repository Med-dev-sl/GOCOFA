"use client";

import { useEffect } from "react";

export type StatusModalVariant = "success" | "error" | "warning" | "info";

interface StatusModalProps {
  open: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
  actionLabel?: string;
  onClose: () => void;
  autoCloseMs?: number;
}

export function StatusModal({
  open,
  variant,
  title,
  message,
  actionLabel = "Continue",
  onClose,
  autoCloseMs,
}: StatusModalProps) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const timer = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [open, autoCloseMs, onClose]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  const symbol = variant === "success" ? "✓" : variant === "error" ? "×" : variant === "warning" ? "!" : "i";

  return (
    <div className="status-modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={`status-modal status-modal--${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-modal-title"
        aria-describedby="status-modal-message"
      >
        <button className="status-modal__close" type="button" onClick={onClose} aria-label="Close">×</button>
        <div className="status-modal__icon" aria-hidden="true">{symbol}</div>
        <h2 id="status-modal-title">{title}</h2>
        <p id="status-modal-message">{message}</p>
        <button className="status-modal__action" type="button" onClick={onClose}>{actionLabel}</button>
      </section>
    </div>
  );
}
