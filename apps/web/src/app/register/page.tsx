"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { SpiderLoader } from "@/components/atoms/SpiderLoader";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    mobile: ""
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      await register(form);
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[100vh] px-4 w-full bg-[var(--fs-void)]">
      <div className="w-full max-w-md bg-[var(--fs-surface)] shadow-2xl rounded-2xl p-8 border border-[var(--fs-wire)]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-serif text-[var(--fs-ivory)] mb-2">
            Create Account
          </h1>
          <p className="text-[var(--fs-ash)]">
            Join Fabric Speaks for a premium experience
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-[var(--fs-error)]/10 border border-[var(--fs-error)] text-[var(--fs-error)] text-center text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--fs-linen)] font-bold">
              Full Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full h-11 px-4 bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-lg focus:border-[var(--fs-linen)] focus:outline-none transition-all text-[var(--fs-ivory)]"
              placeholder="John Doe"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--fs-linen)] font-bold">
              Email Address
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full h-11 px-4 bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-lg focus:border-[var(--fs-linen)] focus:outline-none transition-all text-[var(--fs-ivory)]"
              placeholder="john@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--fs-linen)] font-bold">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full h-11 px-4 bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-lg focus:border-[var(--fs-linen)] focus:outline-none transition-all text-[var(--fs-ivory)]"
              placeholder="Min 8 characters"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-[0.2em] text-[var(--fs-linen)] font-bold">
              Mobile (Optional)
            </label>
            <input
              type="tel"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })}
              className="w-full h-11 px-4 bg-[var(--fs-surface-2)] border border-[var(--fs-wire)] rounded-lg focus:border-[var(--fs-linen)] focus:outline-none transition-all text-[var(--fs-ivory)]"
              placeholder="10-digit mobile number"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-4 bg-[var(--fs-linen)] hover:bg-[var(--fs-linen-dk)] text-[var(--fs-void)] font-bold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center transform active:scale-[0.98]"
          >
            {loading ? <SpiderLoader size="sm" color="var(--fs-void)" /> : "Register Now"}
          </button>

          <p className="text-center text-sm text-[var(--fs-ash)] mt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--fs-linen)] hover:underline">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
