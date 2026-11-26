"use client";

import { useState } from "react";

export default function CopyEmailButton({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  const label =
    status === "copied"
      ? "Copied"
      : status === "error"
        ? "Copy failed"
        : "Copy address";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center border border-line px-4 py-2 text-xs uppercase tracking-[0.12em] text-muted hover:border-ink hover:text-ink"
    >
      <span aria-live="polite">{label}</span>
    </button>
  );
}
