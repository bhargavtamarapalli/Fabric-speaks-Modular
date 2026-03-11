"use client";

import { useRouter } from "next/navigation";

interface ErrorPageProps {
  variant: "not-found" | "server-error" | "service-down" | "offline";
  onRetry?: () => void;
  showHomeLink?: boolean;
}

export function ErrorPage({
  variant,
  onRetry,
  showHomeLink = true,
}: ErrorPageProps) {
  const router = useRouter();

  const content = {
    "not-found": {
      heading: "This page doesn't exist",
      subtext:
        "The product or page you were looking for may have moved or been removed.",
      cta: "Back to home",
      action: () => router.push("/"),
    },
    "server-error": {
      heading: "Something went wrong",
      subtext: "We're working on it. Please try again in a moment.",
      cta: "Try again",
      action: onRetry || (() => window.location.reload()),
    },
    "service-down": {
      heading: "We'll be back shortly",
      subtext:
        "One of our services is temporarily unavailable. Your cart and orders are safe.",
      cta: "Chat on WhatsApp",
      action: () => window.open("https://wa.me/something", "_blank"),
    },
    "offline": {
      heading: "No internet connection",
      subtext:
        "Check your connection and we'll reload automatically when you're back online.",
      cta: "Retry now",
      action: onRetry || (() => window.location.reload()),
    },
  }[variant];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-[length:var(--fs-text-h2)] font-bold text-[var(--fs-text-primary)] mb-4">
        {content.heading}
      </h1>
      <p className="text-[length:var(--fs-text-body)] text-[var(--fs-text-secondary)] mb-8 max-w-md">
        {content.subtext}
      </p>
      <button
        onClick={content.action}
        className="bg-[var(--fs-teal)] text-white px-8 py-3 rounded-[var(--radius-md)] font-medium hover:bg-[var(--fs-teal-dk)] transition-colors"
      >
        {content.cta}
      </button>
      {showHomeLink && variant !== "not-found" && (
        <button
          onClick={() => router.push("/")}
          className="mt-4 text-[var(--fs-teal)] underline decoration-[var(--fs-teal-lt2)] underline-offset-4"
        >
          Back to home
        </button>
      )}
    </div>
  );
}
