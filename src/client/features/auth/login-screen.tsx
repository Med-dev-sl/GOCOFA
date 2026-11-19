"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { StatusModal, StatusModalVariant } from "@/src/client/components/modal/status-modal";
import { BrandSpinner } from "@/src/client/components/loading/brand-spinner";

interface LoginUser {
  fullName: string;
  username: string;
  email: string;
  role: string;
}

interface LoginScreenProps {
  onAuthenticated: (user: LoginUser) => void;
}

export function LoginScreen({ onAuthenticated }: LoginScreenProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<{
    open: boolean;
    variant: StatusModalVariant;
    title: string;
    message: string;
  }>({ open: false, variant: "info", title: "", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in");
      setModal({
        open: true,
        variant: "success",
        title: "Login successful",
        message: `Welcome back, ${data.user.fullName}.`,
      });
      window.setTimeout(() => onAuthenticated(data.user), 900);
    } catch (loginError) {
      const message =
        loginError instanceof Error ? loginError.message : "Unable to sign in";
      setError(message);
      setModal({
        open: true,
        variant: "error",
        title: "Login failed",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-brand">
          <div className="login-logo">
            <Image
              src="/logo/logo.png"
              alt="GOCOFA"
              fill
              priority
              sizes="96px"
            />
          </div>
          <div>
            <p className="login-kicker">Administration</p>
            <h1 id="login-title">Welcome back</h1>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="login-field">
            <span>Username</span>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
              </svg>
              <input
                name="username"
                type="text"
                autoComplete="username"
                placeholder="Enter your username"
                required
              />
            </div>
          </label>

          <label className="login-field">
            <span>Password</span>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />
              <button
                className="password-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.5 0 9 7 9 7a15.8 15.8 0 0 1-2.1 3.1M6.6 6.6C4.2 8.2 3 12 3 12s3.5 7 9 7a9.8 9.8 0 0 0 4.1-.9" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" name="remember" />
              <span>Remember me</span>
            </label>
            <button type="button" className="forgot-button">
              Forgot password?
            </button>
          </div>

          <button className="login-submit" type="submit" disabled={submitting}>
            {submitting ? <BrandSpinner label="Signing in" compact /> : (
              <>
                <span>Sign in</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>

          {error && <p className="login-error">{error}</p>}
        </form>

        <p className="login-footer">GOCOFA Administration Portal</p>
      </section>

      <StatusModal
        open={modal.open}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        actionLabel={modal.variant === "success" ? "Open dashboard" : "Try again"}
        onClose={() => setModal((current) => ({ ...current, open: false }))}
      />
    </main>
  );
}
