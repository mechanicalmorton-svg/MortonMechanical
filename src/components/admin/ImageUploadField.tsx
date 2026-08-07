"use client";

import { useRef, useState } from "react";
import { ImageOff, Loader2, Trash2, Upload } from "lucide-react";
import { adminSend } from "./admin-fetch";
import { useAdminToast } from "./AdminToast";
import { btnSecondary } from "./admin-ui";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/x-icon";

type Props = {
  label: string;
  hint?: string;
  /** Used to name the stored file, e.g. "logo" or "hero". */
  slot: string;
  value: string;
  onChange: (url: string) => void;
  /** Restored when the image is removed. Empty means "no image". */
  fallback?: string;
  /** Shown in the preview while this slot is empty and inheriting another image. */
  inherits?: string;
  preview?: "wide" | "square" | "icon";
};

export function ImageUploadField({
  label,
  hint,
  slot,
  value,
  onChange,
  fallback = "",
  inherits,
  preview = "wide",
}: Props) {
  const toast = useAdminToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const frame =
    preview === "icon"
      ? "h-16 w-16"
      : preview === "square"
        ? "h-28 w-28"
        : "h-28 w-full max-w-[18rem]";

  async function upload(file: File | null) {
    if (!file) return;
    setBusy(true);
    const previous = value;
    const body = new FormData();
    body.set("slot", slot);
    body.set("file", file);

    const { data, error } = await adminSend<{ url: string }>("/api/admin/site-media", {
      method: "POST",
      body,
    });
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";

    if (error || !data?.url) {
      toast.error(error ?? "Could not upload image.");
      return;
    }

    onChange(data.url);
    toast.success(`${label} uploaded. Save to publish it.`);
    if (previous && previous !== fallback) void discard(previous);
  }

  async function discard(url: string) {
    await adminSend("/api/admin/site-media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  }

  async function remove() {
    setBusy(true);
    if (value && value !== fallback) await discard(value);
    setBusy(false);
    onChange(fallback);
    toast.success(
      fallback || inherits ? `${label} reset to the default.` : `${label} removed.`,
    );
  }

  const shown = value || inherits || "";
  const inheriting = !value && !!inherits;

  return (
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 p-4">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <div
          className={`${frame} flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950/60`}
        >
          {shown ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={shown}
              alt=""
              className={`h-full w-full object-contain ${inheriting ? "opacity-40" : ""}`}
            />
          ) : (
            <ImageOff className="h-5 w-5 text-slate-600" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnSecondary}
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {value ? "Replace" : "Upload"}
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={remove}
            disabled={busy || !value}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
          {inheriting ? (
            <span className="text-xs text-slate-500">Using the default logo</span>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
