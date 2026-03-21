"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { OTPInput } from "@/components/atoms/OTPInput";
import { SpiderLoader } from "@/components/atoms/SpiderLoader";
import { apiFetch } from "@/lib/apiClient";

type LoginState = "idle" | "sending" | "otp-sent" | "verifying" | "success";

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState<LoginState>("idle");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [timer, setTimer] = useState(120);
  const sendOtpControllerRef = useRef<AbortController | null>(null);
  const verifyOtpControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sendOtpControllerRef.current?.abort();
      verifyOtpControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === "otp-sent" && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state, timer]);

  const sendOtp = async () => {
    if (mobile.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }
    setErrorMsg("");
    setState("sending");
    // Cancel any existing request
    sendOtpControllerRef.current?.abort();
    sendOtpControllerRef.current = new AbortController();
    try {
      await apiFetch("/auth/send-otp", {
        method: "POST",
        data: { mobile },
        signal: sendOtpControllerRef.current.signal
      });
      setState("otp-sent");
      setTimer(120);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setErrorMsg(err.message || "Failed to send OTP. Please try again or wait if rate limited.");
      setState("idle");
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    sendOtp();
  };

  const handleVerifyOtp = async (code: string) => {
    if (code.length < 6) return;
    setErrorMsg("");
    setState("verifying");
    // Cancel any existing request
    verifyOtpControllerRef.current?.abort();
    verifyOtpControllerRef.current = new AbortController();
    try {
      await apiFetch("/auth/verify-otp", {
        method: "POST",
        data: { mobile, otp: code },
        signal: verifyOtpControllerRef.current.signal
      });
      setState("success");
      const returnUrl = new URLSearchParams(window.location.search).get("returnUrl") || "/";
      router.push(returnUrl);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      setErrorMsg(err.message || "Invalid OTP entered.");
      setState("otp-sent");
      setOtp("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] px-4 w-full bg-[var(--fs-surface-1)]">
      <div className="w-full max-w-md bg-[var(--fs-surface-0)] shadow-[var(--shadow-lg)] rounded-[var(--radius-lg)] p-6 sm:p-[var(--space-8)]">
        <div className="mb-8 text-center">
          <h1 className="text-[length:var(--fs-text-h2)] font-serif text-[var(--fs-text-primary)] mb-2">
            Welcome to Fabric Speaks
          </h1>
          <p className="text-[length:var(--fs-text-body)] text-[var(--fs-text-secondary)]">
            {state === "idle" || state === "sending"
              ? "Enter your mobile number to continue"
              : `We've sent a 6-digit code to +91 ${mobile}`}
          </p>
        </div>

        {errorMsg && (
          <div
            id="login-error"
            role="alert"
            className="mb-6 p-4 rounded-[var(--radius-sm)] bg-[var(--fs-error-lt)] border border-[var(--fs-error)] text-[var(--fs-error)] text-center text-[length:var(--fs-text-body-sm)]"
          >
            {errorMsg}
          </div>
        )}

        {(state === "idle" || state === "sending") && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-2 relative">
              <label htmlFor="mobile" className="text-[11px] uppercase tracking-widest text-[var(--fs-text-secondary)] font-medium">
                Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--fs-text-secondary)] font-medium">
                  +91
                </span>
                <input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full h-12 pl-14 pr-4 border border-[var(--fs-text-disabled)] rounded-[var(--radius-md)] focus:border-[var(--fs-teal)] focus:ring-1 focus:ring-[var(--fs-teal)] focus:outline-none transition-all text-lg tracking-wide bg-[var(--fs-surface-0)] text-[var(--fs-text-primary)]"
                  placeholder="10-digit mobile number"
                  disabled={state === "sending"}
                  required
                  autoFocus
                  aria-required="true"
                  aria-describedby={errorMsg ? "login-error" : undefined}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={mobile.length < 10 || state === "sending"}
              className="w-full h-[48px] bg-[var(--fs-teal)] hover:bg-[var(--fs-teal-dk)] text-white font-medium rounded-[var(--radius-md)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {state === "sending" ? <SpiderLoader size="sm" color="white" /> : "Send OTP"}
            </button>
            <div className="text-center mt-2">
              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="text-[length:var(--fs-text-body-sm)] text-[var(--fs-text-secondary)] underline underline-offset-4 decoration-[var(--fs-text-disabled)] hover:text-[var(--fs-teal)] transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          </form>
        )}

        {(state === "otp-sent" || state === "verifying" || state === "success") && (
          <div className="flex flex-col gap-6 items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            {state === "verifying" || state === "success" ? (
              <div className="h-[56px] flex items-center justify-center">
                {state === "success" ? (
                  <div className="text-[var(--fs-success)] font-medium text-lg">Verified successfully! Redirecting...</div>
                ) : (
                  <SpiderLoader size="md" color="var(--fs-teal)" />
                )}
              </div>
            ) : (
              <OTPInput
                length={6}
                value={otp}
                onChange={setOtp}
                onComplete={handleVerifyOtp}
                disabled={false}
                error={!!errorMsg}
                autoFocus
              />
            )}

            {state === "otp-sent" && (
              <div className="text-center w-full mt-2 text-[length:var(--fs-text-body-sm)] text-[var(--fs-text-secondary)]">
                {timer > 0 ? (
                  <span>Resend code in <strong className="tabular-nums font-medium text-[var(--fs-text-primary)]">0{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</strong></span>
                ) : (
                  <button
                    onClick={sendOtp}
                    className="text-[var(--fs-teal)] font-medium hover:underline focus:outline-none"
                  >
                    Resend OTP
                  </button>
                )}
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setState("idle");
                      setErrorMsg("");
                      setOtp("");
                    }}
                    className="underline text-[var(--fs-text-disabled)] hover:text-[var(--fs-text-primary)] transition-colors"
                  >
                    Change Number
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
