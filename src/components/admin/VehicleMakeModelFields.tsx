"use client";

import { useMemo, useState } from "react";
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
  onMakeChange: (make: string, makeId: number | null) => void;
  onModelChange: (model: string) => void;
};

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
  onMakeChange,
  onModelChange,
}: Props) {
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");

  const filteredMakes = useMemo(() => {
    const q = makeFilter.trim().toLowerCase();
    if (!q) return makes;
    return makes.filter((m) => m.name.toLowerCase().includes(q));
  }, [makeFilter, makes]);

  const filteredModels = useMemo(() => {
    const q = modelFilter.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.toLowerCase().includes(q));
  }, [modelFilter, models]);

  const selectedMakeId =
    makeId ?? makes.find((m) => m.name.toLowerCase() === make.toLowerCase())?.id ?? "";

  return (
    <>
      <label className="block text-sm text-slate-400 sm:col-span-2 lg:col-span-1">
        Make{required ? <span className="text-amber-400"> *</span> : null}
        <p className="mt-0.5 text-xs font-normal text-slate-500">From NHTSA catalog, or type any make.</p>
        <div className="mt-1 space-y-2">
          <input
            className={inputClass}
            placeholder={`Filter ${makes.length.toLocaleString()} makes…`}
            value={makeFilter}
            onChange={(e) => setMakeFilter(e.target.value)}
            disabled={disabled || loadingMakes}
          />
          <div className="relative">
            <select
              className={`${inputClass} pr-9`}
              value={selectedMakeId}
              disabled={disabled || loadingMakes || !makes.length}
              onChange={(e) => {
                const id = Number(e.target.value);
                const selected = makes.find((m) => m.id === id);
                onMakeChange(selected?.name ?? "", selected?.id ?? null);
                setModelFilter("");
              }}
              size={1}
            >
              <option value="">{loadingMakes ? "Loading all makes…" : `Select make (${filteredMakes.length.toLocaleString()} shown)`}</option>
              {filteredMakes.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {loadingMakes && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
            )}
          </div>
          {make && !makeId && (
            <p className="text-xs text-amber-300">Using saved make: {make}</p>
          )}
        </div>
      </label>

      <label className="block text-sm text-slate-400 sm:col-span-2 lg:col-span-1">
        Model{required ? <span className="text-amber-400"> *</span> : null}
        <p className="mt-0.5 text-xs font-normal text-slate-500">Pick from catalog or type any model.</p>
        <div className="mt-1 space-y-2">
          <input
            className={inputClass}
            placeholder={make ? `Filter ${models.length.toLocaleString()} models…` : "Select a make first"}
            value={modelFilter}
            onChange={(e) => setModelFilter(e.target.value)}
            disabled={disabled || !make || loadingModels}
          />
          <div className="relative">
            <select
              className={`${inputClass} pr-9`}
              value={model}
              disabled={disabled || !make || loadingModels}
              onChange={(e) => onModelChange(e.target.value)}
            >
              <option value="">
                {!make
                  ? "Select make first"
                  : loadingModels
                    ? "Loading all models…"
                    : models.length
                      ? `Select model (${filteredModels.length.toLocaleString()} shown)`
                      : "No models found — type below"}
              </option>
              {filteredModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {loadingModels && (
              <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-500" />
            )}
          </div>
          <input
            className={inputClass}
            placeholder="Or type model manually"
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={disabled || !make}
          />
        </div>
      </label>
    </>
  );
}
