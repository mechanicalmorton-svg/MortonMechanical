"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Mail, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { StaffRole } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { useAdminToast } from "./AdminToast";
import { PageHeader, RoleBadge, btnPrimary, btnSecondary, inputClass } from "./admin-ui";

type AccountProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StaffRole;
  avatarUrl?: string;
  usesSupabaseAuth: boolean;
};

type Props = {
  user: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: StaffRole;
    roleIds?: StaffRole[];
    roles?: { id: string; name: string; color: string }[];
    roleName?: string;
    roleColor?: string;
    avatarUrl?: string;
    permissions?: { manageUsers?: boolean };
  };
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-5 py-4">
        <h2 className="admin-glass-title admin-glass-title--sm admin-display">
          <span className="admin-glass-title__sheen" aria-hidden />
          <span className="admin-glass-title__text">{title}</span>
        </h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

export function SettingsPanel({ user }: Props) {
  const toast = useAdminToast();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManagePayments = Boolean(
    user.permissions?.manageUsers ||
      user.roleIds?.includes("owner") ||
      user.roleIds?.includes("admin") ||
      user.role === "owner" ||
      user.role === "admin",
  );

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [depositDollars, setDepositDollars] = useState("50");
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [savingDeposit, setSavingDeposit] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingProfile(true);
    adminGet<AccountProfile>("/api/admin/account").then(({ data, error }) => {
      if (!active) return;
      if (error) {
        toast.error(error);
        setProfile(null);
      } else if (data) {
        setProfile(data);
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone);
        setAvatarUrl(data.avatarUrl ?? "");
      }
      setLoadingProfile(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!canManagePayments) return;
    let active = true;
    setLoadingPayments(true);
    adminGet<{ bookingDepositCents?: number; stripeConfigured?: boolean }>("/api/admin/payments/settings").then(
      ({ data, error }) => {
        if (!active) return;
        if (error) {
          toast.error(error);
        } else if (data) {
          const cents = Number(data.bookingDepositCents ?? 5000);
          setDepositDollars((cents / 100).toFixed(cents % 100 === 0 ? 0 : 2));
          setStripeConfigured(Boolean(data.stripeConfigured));
        }
        setLoadingPayments(false);
      },
    );
    return () => {
      active = false;
    };
  }, [canManagePayments]);

  function refreshPortal() {
    router.refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    const { data, error } = await adminSend<AccountProfile>("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    });
    setSavingProfile(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data) {
      setProfile(data);
      setName(data.name);
      setEmail(data.email);
      setPhone(data.phone);
      setAvatarUrl(data.avatarUrl ?? avatarUrl);
    }
    toast.success("Account details updated.");
    refreshPortal();
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) return;
    setUploadingAvatar(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/account/avatar", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not upload photo.");
        return;
      }
      setAvatarUrl(data.avatarUrl ?? "");
      toast.success("Profile photo updated.");
      refreshPortal();
    } catch {
      toast.error("Could not upload photo.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeAvatar() {
    setUploadingAvatar(true);
    const { error } = await adminSend("/api/admin/account/avatar", { method: "DELETE" });
    setUploadingAvatar(false);
    if (error) {
      toast.error(error);
      return;
    }
    setAvatarUrl("");
    toast.success("Profile photo removed.");
    refreshPortal();
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    if (usesSupabaseAuth && !currentPassword.trim()) {
      toast.error("Enter your current password.");
      return;
    }
    setSavingPassword(true);
    const { error } = await adminSend("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "password",
        currentPassword: currentPassword || undefined,
        password,
        confirm,
      }),
    });
    setSavingPassword(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success("Password updated successfully.");
    setCurrentPassword("");
    setPassword("");
    setConfirm("");
  }

  async function sendResetEmail() {
    setSendingReset(true);
    const { error, data } = await adminSend<{ message?: string }>("/api/admin/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password" }),
    });
    setSendingReset(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(data?.message ?? "Password reset email sent.");
  }

  async function saveDeposit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(depositDollars);
    if (!Number.isFinite(dollars) || dollars < 0) {
      toast.error("Enter a valid deposit amount.");
      return;
    }
    setSavingDeposit(true);
    const { data, error } = await adminSend<{ bookingDepositCents?: number; stripeConfigured?: boolean }>(
      "/api/admin/payments/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingDepositDollars: dollars }),
      },
    );
    setSavingDeposit(false);
    if (error) {
      toast.error(error);
      return;
    }
    if (data?.bookingDepositCents != null) {
      const cents = data.bookingDepositCents;
      setDepositDollars((cents / 100).toFixed(cents % 100 === 0 ? 0 : 2));
      setStripeConfigured(Boolean(data.stripeConfigured));
    }
    toast.success("Booking deposit updated.");
  }

  const usesSupabaseAuth = profile?.usesSupabaseAuth ?? Boolean(user.email?.includes("@"));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Account Settings"
        subtitle="Manage your profile, sign-in email, photo, password, and payment settings."
      />

      {loadingProfile ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 p-10 text-slate-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading account…
        </div>
      ) : (
        <>
          <Section title="Profile photo" description="This photo appears in the portal sidebar and on your account.">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-700" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800 text-xl font-semibold text-amber-200 ring-2 ring-slate-700">
                    {initials(name || user.name) || <UserRound className="h-8 w-8" />}
                  </div>
                )}
                {uploadingAvatar ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={!usesSupabaseAuth || uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  Upload photo
                </button>
                {avatarUrl ? (
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={uploadingAvatar}
                    onClick={removeAvatar}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
            {!usesSupabaseAuth ? (
              <p className="text-sm text-slate-500">Profile photos are available when signed in with Supabase.</p>
            ) : (
              <p className="text-sm text-slate-500">JPG, PNG, WebP, or GIF up to 2 MB.</p>
            )}
          </Section>

          <form onSubmit={saveProfile}>
            <Section title="Profile details" description="Update how your name and contact details appear across the portal.">
              <label className="block text-sm text-slate-300">
                <span className="font-medium text-slate-200">Display name</span>
                <input
                  className={`${inputClass} mt-1.5`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={!usesSupabaseAuth}
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="font-medium text-slate-200">Email</span>
                <input
                  type="email"
                  className={`${inputClass} mt-1.5`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={!usesSupabaseAuth}
                />
                {usesSupabaseAuth ? (
                  <p className="mt-1 text-xs text-slate-500">Must be an @mortonsmechanical.com address.</p>
                ) : null}
              </label>

              <label className="block text-sm text-slate-300">
                <span className="font-medium text-slate-200">Phone</span>
                <input
                  type="tel"
                  className={`${inputClass} mt-1.5`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                  disabled={!usesSupabaseAuth}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
                <span>{(user.roles?.length ?? user.roleIds?.length ?? 1) > 1 ? "Roles" : "Role"}</span>
                {(user.roles?.length
                  ? user.roles
                  : (user.roleIds?.length ? user.roleIds : [user.role]).map((id) => ({
                      id,
                      name: id === user.role ? user.roleName || id : id,
                      color: id === user.role ? user.roleColor || "slate" : "slate",
                    }))
                ).map((role) => (
                  <RoleBadge key={role.id} role={role.id} roleName={role.name} roleColor={role.color} />
                ))}
                <span className="text-slate-600">·</span>
                <span>Contact an admin to change your roles.</span>
              </div>

              <div className="flex justify-end">
                <button type="submit" className={btnPrimary} disabled={savingProfile || !usesSupabaseAuth}>
                  {savingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </Section>
          </form>

          {canManagePayments ? (
            <form onSubmit={saveDeposit}>
              <Section
                title="Booking deposit"
                description="Amount collected via Stripe Checkout when a customer submits the quote form."
              >
                {loadingPayments ? (
                  <p className="text-sm text-slate-500">Loading payment settings…</p>
                ) : (
                  <>
                    <label className="block text-sm text-slate-300">
                      <span className="font-medium text-slate-200">Booking deposit ($)</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className={`${inputClass} mt-1.5`}
                        value={depositDollars}
                        onChange={(e) => setDepositDollars(e.target.value)}
                        required
                      />
                    </label>
                    <p className="text-xs text-slate-500">
                      {stripeConfigured
                        ? "Stripe is configured — quote submissions will redirect to Checkout for this deposit."
                        : "Stripe keys are not set yet. Quote submissions still save without payment until STRIPE_SECRET_KEY is configured."}
                    </p>
                    <div className="flex justify-end">
                      <button type="submit" className={btnPrimary} disabled={savingDeposit}>
                        {savingDeposit ? "Saving…" : "Save deposit"}
                      </button>
                    </div>
                  </>
                )}
              </Section>
            </form>
          ) : null}

          <form onSubmit={handlePasswordSubmit}>
            <Section
              title="Password"
              description="Change your password here, or send yourself a reset link by email."
            >
              {usesSupabaseAuth ? (
                <label className="block text-sm text-slate-300">
                  <span className="font-medium text-slate-200">Current password</span>
                  <input
                    type="password"
                    className={`${inputClass} mt-1.5`}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Required to set a new password"
                  />
                </label>
              ) : null}

              <label className="block text-sm text-slate-300">
                <span className="font-medium text-slate-200">New password</span>
                <input
                  type="password"
                  className={`${inputClass} mt-1.5`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>

              <label className="block text-sm text-slate-300">
                <span className="font-medium text-slate-200">Confirm new password</span>
                <input
                  type="password"
                  className={`${inputClass} mt-1.5`}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={btnPrimary} disabled={savingPassword || !password}>
                  {savingPassword ? "Saving…" : "Update password"}
                </button>
                {usesSupabaseAuth ? (
                  <button
                    type="button"
                    className={btnSecondary}
                    disabled={sendingReset}
                    onClick={sendResetEmail}
                  >
                    <Mail className="h-4 w-4" />
                    {sendingReset ? "Sending…" : "Email reset link"}
                  </button>
                ) : null}
              </div>
            </Section>
          </form>
        </>
      )}
    </div>
  );
}
