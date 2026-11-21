"use client";

import Image from "next/image";
import { useEffect } from "react";

export type StatusModalVariant = "success" | "error" | "warning" | "info";

interface StatusModalProps {
  open: boolean;
  variant: StatusModalVariant;
  title: string;
  message: string;
  actionLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onAction?: () => void;
  autoCloseMs?: number;
}

export function StatusModal({
  open,
  variant,
  title,
  message,
  actionLabel = "Continue",
  cancelLabel = "Cancel",
  onClose,
  onAction,
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
        <div className="status-modal__logo">
          <Image src="/logo/logo.png" alt="GOCOFA" width={52} height={52} priority />
        </div>
        {variant !== "warning" && <div className="status-modal__icon" aria-hidden="true">{symbol}</div>}
        <h2 id="status-modal-title">{title}</h2>
        <p id="status-modal-message">{message}</p>
        <div className="status-modal__actions">
          {onAction && (
            <button className="status-modal__action" type="button" onClick={onAction}>{actionLabel}</button>
          )}
          {!onAction && (
            <button className="status-modal__action" type="button" onClick={onClose}>{actionLabel}</button>
          )}
          {onAction && cancelLabel && (
            <button className="status-modal__cancel" type="button" onClick={onClose}>{cancelLabel}</button>
          )}
        </div>
      </section>
    </div>
  );
}
