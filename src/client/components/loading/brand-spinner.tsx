"use client";

import Image from "next/image";

interface BrandSpinnerProps {
  label?: string;
  compact?: boolean;
}

export function BrandSpinner({ label = "Processing", compact = false }: BrandSpinnerProps) {
  return (
    <span className={compact ? "brand-spinner brand-spinner--compact" : "brand-spinner"} role="status" aria-live="polite">
      <span className="brand-spinner__mark" aria-hidden="true">
        <Image src="/logo/logo.png" alt="" fill sizes={compact ? "24px" : "52px"} />
      </span>
      <span className="brand-spinner__copy">{label}</span>
    </span>
  );
}
