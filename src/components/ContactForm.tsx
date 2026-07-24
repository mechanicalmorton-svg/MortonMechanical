"use client";

import { useState } from "react";

import type { SiteContent } from "@/lib/content-types";

type FormState = {
  name: string;
  phone: string;
  email: string;
  rego: string;
  service: string;
  contactMethod: "phone" | "email";
  message: string;
  consent: boolean;
};

type Props = {
  serviceOptions: string[];
  form: SiteContent["pages"]["form"];
};

export function ContactForm({ serviceOptions, form: formCopy }: Props) {
  const initial: FormState = {
    name: "",
    phone: "",
    email: "",
    rego: "",
    service: serviceOptions[0] ?? "Other",
    contactMethod: "phone",
    message: "",
    consent: false,
  };

  const [form, setForm] = useState<FormState>(initial);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus("success");
      setForm({ ...initial, service: serviceOptions[0] ?? "Other" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
        <h3 className="text-xl font-bold text-white">{formCopy.successTitle}</h3>
        <p className="mt-2 text-slate-300">{formCopy.successMessage}</p>
        <button
          type="button"
          className="mt-6 text-sm font-semibold text-amber-400 hover:text-amber-300"
          onClick={() => setStatus("idle")}
        >
          Submit another request
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status === "error" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-200">
            Full name <span className="text-amber-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1 block text-sm font-medium text-slate-200">
            Phone <span className="text-amber-400">*</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-500">We&apos;ll call or text to confirm details.</p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-200">
            Email <span className="text-slate-500">(optional)</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="rego" className="mb-1 block text-sm font-medium text-slate-200">
            Registration / plate
          </label>
          <input
            id="rego"
            name="rego"
            className={inputClass}
            placeholder="ABC123"
            value={form.rego}
            onChange={(e) => setForm({ ...form, rego: e.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="service" className="mb-1 block text-sm font-medium text-slate-200">
            Service needed
          </label>
          <select
            id="service"
            name="service"
            className={inputClass}
            value={form.service}
            onChange={(e) => setForm({ ...form, service: e.target.value })}
          >
            {serviceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="mb-2 block text-sm font-medium text-slate-200">Preferred contact</legend>
          <div className="flex gap-4">
            {(["phone", "email"] as const).map((method) => (
              <label key={method} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="contactMethod"
                  value={method}
                  checked={form.contactMethod === method}
                  onChange={() => setForm({ ...form, contactMethod: method })}
                  className="accent-amber-500"
                />
                {method === "phone" ? "Phone" : "Email"}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div>
        <label htmlFor="message" className="mb-1 block text-sm font-medium text-slate-200">
          How can we help?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className={inputClass}
          placeholder="Describe the issue, your location, and when you're available…"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-400">
        <input
          type="checkbox"
          required
          checked={form.consent}
          onChange={(e) => setForm({ ...form, consent: e.target.checked })}
          className="mt-0.5 accent-amber-500"
        />
        <span>
          I agree to be contacted about this enquiry. See our{" "}
          <a href="/privacy" className="text-amber-400 underline-offset-2 hover:underline">
            Privacy Policy
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-amber-400 hover:to-pink-500 disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Sending…" : formCopy.submitText}
      </button>
      <p className="text-xs text-slate-500">{formCopy.footerNote}</p>
    </form>
  );
}
