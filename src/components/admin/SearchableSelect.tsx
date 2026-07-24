"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { inputClass } from "./admin-ui";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  allowCustom?: boolean;
  closeSignal?: number;
  className?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  loading = false,
  disabled = false,
  allowCustom = true,
  closeSignal = 0,
  className = inputClass,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    setOpen(false);
  }, [closeSignal]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 200);
  }, [options, query]);

  function pick(option: string) {
    onChange(option);
    setQuery(option);
    setOpen(false);
  }

  function commitCustom() {
    const next = query.trim();
    if (!next) return;
    if (allowCustom || options.some((o) => o.toLowerCase() === next.toLowerCase())) {
      onChange(next);
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          className={`${className} pr-9`}
          value={query}
          placeholder={placeholder}
          disabled={disabled || loading}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (allowCustom) onChange(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered[0]) pick(filtered[0]);
              else commitCustom();
            } else if (e.key === "Escape") {
              setOpen(false);
              setQuery(value);
            }
          }}
          aria-expanded={open}
          aria-controls={listId}
          autoComplete="off"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl"
          role="listbox"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-slate-500">Loading…</li>
          ) : filtered.length ? (
            filtered.map((option) => (
              <li key={option}>
                <button
                  type="button"
                  className={`block w-full px-3 py-2 text-left text-sm transition hover:bg-slate-800 ${
                    option === value ? "bg-amber-500/10 text-amber-200" : "text-slate-200"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(option)}
                >
                  {option}
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-slate-500">
              {allowCustom && query.trim() ? `Use "${query.trim()}"` : "No matches"}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
