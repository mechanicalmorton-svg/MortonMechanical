"use client";

import { useId, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { inputClass } from "./admin-ui";

type MakeOption = { id: number; name: string };

type Props = {
  make: string;
  makeId: number | null;
  model: string;
  makes: MakeOption[];
  models: string[];
  loadingMakes?: boolean;
  loadingModels?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Extra class on each field wrapper (e.g. grid column span). */
  className?: string;
  onMakeChange: (make: string, makeId: number | null) => void;
  onModelChange: (model: string) => void;
};

/**
 * Single searchable make + model fields (catalog suggestions via datalist).
 * Type freely or pick from the list — no separate filter/select/manual stack.
 */
export function VehicleMakeModelFields({
  make,
  makeId,
  model,
  makes,
  models,
  loadingMakes = false,
  loadingModels = false,
  disabled = false,
  required = false,
  className,
  onMakeChange,
  onModelChange,
}: Props) {
  const uid = useId();
  const makeListId = `${uid}-makes`;
  const modelListId = `${uid}-models`;

  const makeSuggestions = useMemo(() => {
    const q = make.trim().toLowerCase();
    if (!q) return makes.slice(0, 80);
    return makes.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 80);
  }, [make, makes]);

  const modelSuggestions = useMemo(() => {
    const q = model.trim().toLowerCase();
    if (!q) return models.slice(0, 80);
    return models.filter((m) => m.toLowerCase().includes(q)).slice(0, 80);
  }, [model, models]);

  const fieldClass = className ?? "";

  return (
    <>
      <label className={`block text-sm text-slate-300 ${fieldClass}`}>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Make{required ? <span className="text-amber-400"> *</span> : null}
        </span>
        <div className="relative">
          <input
            className={`${inputClass} ${loadingMakes ? "pr-9" : ""}`}
            list={makeListId}
            placeholder={loadingMakes ? "Loading makes…" : "Start typing, e.g. Ford"}
            value={make}
            required={required}
            disabled={disabled || loadingMakes}
            autoComplete="off"
            onChange={(e) => {
              const value = e.target.value;
              const matched = makes.find((m) => m.name.toLowerCase() === value.trim().toLowerCase());
              onMakeChange(value, matched?.id ?? null);
            }}
          />
          {loadingMakes ? (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
          ) : null}
          <datalist id={makeListId}>
            {makeSuggestions.map((m) => (
              <option key={m.id} value={m.name} />
            ))}
          </datalist>
        </div>
        {make && !makeId && !loadingMakes ? (
          <p className="mt-1 text-[11px] text-slate-500">Custom make (not from catalog)</p>
        ) : null}
      </label>

      <label className={`block text-sm text-slate-300 ${fieldClass}`}>
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Model{required ? <span className="text-amber-400"> *</span> : null}
        </span>
        <div className="relative">
          <input
            className={`${inputClass} ${loadingModels ? "pr-9" : ""}`}
            list={modelListId}
            placeholder={!make.trim() ? "Enter make first" : loadingModels ? "Loading models…" : "Start typing, e.g. F-150"}
            value={model}
            required={required}
            disabled={disabled || !make.trim() || loadingModels}
            autoComplete="off"
            onChange={(e) => onModelChange(e.target.value)}
          />
          {loadingModels ? (
            <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
          ) : null}
          <datalist id={modelListId}>
            {modelSuggestions.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </div>
      </label>
    </>
  );
}
