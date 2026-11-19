"use client";

import Image from "next/image";

interface LogoLoaderProps {
  label?: string;
}

export function LogoLoader({ label = "Loading GOCOFA" }: LogoLoaderProps) {
  return (
    <div className="logo-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="logo-loader__mark">
        <Image
          src="/logo/logo.png"
          alt="GOCOFA"
          fill
          priority
          sizes="(max-width: 640px) 150px, 190px"
        />
      </div>

      <div className="logo-loader__copy">
        <span>{label}</span>
        <span className="logo-loader__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>

      <div className="logo-loader__track" aria-hidden="true">
        <div className="logo-loader__progress" />
      </div>
    </div>
  );
}
