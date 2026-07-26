"use client";

import { useMemo, useState } from "react";
import {
  findPermissionDependencyIssues,
  getPermissionModules,
  getRegisteredKeys,
  tabsFromActions,
} from "@/lib/permissions/catalog";
import {
  ROLE_COLORS,
  ROLE_COLOR_HEX,
  isHexColor,
  isRoleColor,
  isValidRoleColor,
  normalizeOptionalHex,
  normalizeRoleColor,
  normalizeRoleColorStyle,
  resolveRoleColorHex,
  type RoleColorStyle,
} from "@/lib/role-definitions";
import { ChevronDown, Search } from "lucide-react";
import { RoleBadge, inputClass } from "./admin-ui";

export type RoleAccessFormState = {
  id: string;
  name: string;
  color: string;
  colorStyle?: RoleColorStyle;
  description: string;
  actions: string[];
  tabs: string[];
  manageUsers: boolean;
  editSiteContent: boolean;
  archived: boolean;
};

function ColorPickerField({
  label,
  hint,
  enabled,
  onEnabledChange,
  value,
  fallback,
  onChange,
}: {
  label: string;
  hint?: string;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  value: string;
  fallback: string;
  onChange: (hex: string) => void;
}) {
  const hex = normalizeOptionalHex(value) || resolveRoleColorHex(fallback);
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5">
      <label className="flex cursor-pointer items-center justify-between gap-2">
        <span>
          <span className="block text-sm font-medium text-slate-200">{label}</span>
          {hint ? <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span> : null}
        </span>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="accent-amber-500"
        />
      </label>
      {enabled ? (
        <div className="mt-2.5 flex items-center gap-2">
          <label className="relative inline-flex h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
            <span className="absolute inset-1 rounded-md" style={{ background: hex }} />
            <input
              type="color"
              value={hex}
              onChange={(e) => onChange(normalizeRoleColor(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-label={`${label} color picker`}
            />
          </label>
          <input
            className={`${inputClass} font-mono text-xs uppercase`}
            value={hex}
            onChange={(e) => {
              const next = e.target.value.trim();
              onChange(next.startsWith("#") ? next : `#${next}`);
            }}
            onBlur={() => {
              const normalized = normalizeOptionalHex(hex);
              if (normalized) onChange(normalized);
            }}
            spellCheck={false}
            aria-label={`${label} hex`}
          />
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  value: RoleAccessFormState;
  onChange: (next: RoleAccessFormState) => void;
  ownerLocked?: boolean;
};

type FilterMode = "all" | "granted" | "missing";

function syncDerived(actions: string[], description: string, archived?: boolean): Pick<
  RoleAccessFormState,
  "actions" | "tabs" | "manageUsers" | "editSiteContent" | "description" | "archived"
> {
  const keys = getRegisteredKeys();
  const unique = [...new Set(actions.filter((key) => keys.includes(key)))];
  return {
    actions: unique,
    tabs: tabsFromActions(unique),
    manageUsers: unique.some((key) => key.startsWith("users.") || key.startsWith("roles.")),
    editSiteContent: unique.includes("content.edit"),
    description,
    archived: Boolean(archived),
  };
}

export function RoleAccessEditor({ value, onChange, ownerLocked = false }: Props) {
  const modules = getPermissionModules();
  const allKeys = getRegisteredKeys();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterMode>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(modules.map((module) => [module.id, module.id === "work_orders" || module.id === "dashboard"])),
  );

  const effectiveActions = ownerLocked ? [...allKeys] : value.actions;
  const actionSet = new Set(effectiveActions);
  const dependencyIssues = ownerLocked ? [] : findPermissionDependencyIssues(effectiveActions);
  const q = search.trim().toLowerCase();

  const visibleModules = useMemo(() => {
    return modules
      .map((module) => {
        const permissions = module.permissions.filter((permission) => {
          const granted = actionSet.has(permission.key);
          if (filter === "granted" && !granted && !ownerLocked) return false;
          if (filter === "missing" && (granted || ownerLocked)) return false;
          if (!q) return true;
          return (
            module.label.toLowerCase().includes(q) ||
            permission.label.toLowerCase().includes(q) ||
            permission.key.toLowerCase().includes(q) ||
            (permission.description ?? "").toLowerCase().includes(q)
          );
        });
        return { ...module, permissions };
      })
      .filter((module) => module.permissions.length > 0);
  }, [modules, actionSet, filter, ownerLocked, q]);

  const moduleChips = modules
    .filter((module) => module.permissions.some((permission) => actionSet.has(permission.key)))
    .map((module) => module.label);

  function patch(partial: Partial<RoleAccessFormState>) {
    onChange({ ...value, ...partial });
  }

  function setActions(nextActions: string[]) {
    if (ownerLocked) return;
    patch(syncDerived(nextActions, value.description ?? "", value.archived));
  }

  function toggleAction(key: string, enabled: boolean) {
    if (ownerLocked) return;
    const next = new Set(value.actions);
    if (enabled) {
      next.add(key);
      const def = modules.flatMap((module) => module.permissions).find((permission) => permission.key === key);
      for (const dep of def?.dependsOn ?? []) next.add(dep);
    } else {
      next.delete(key);
    }
    setActions([...next]);
  }

  function setModuleAll(moduleId: string, enabled: boolean) {
    if (ownerLocked) return;
    const module = modules.find((item) => item.id === moduleId);
    if (!module) return;
    const next = new Set(value.actions);
    for (const permission of module.permissions) {
      if (enabled) {
        next.add(permission.key);
        for (const dep of permission.dependsOn ?? []) next.add(dep);
      } else {
        next.delete(permission.key);
      }
    }
    setActions([...next]);
  }

  const colorHex = resolveRoleColorHex(value.color);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-950/90 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block text-sm text-slate-300">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Role name</span>
              <input
                className={`${inputClass} mt-1.5`}
                value={value.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="e.g. Service Advisor"
                required
              />
            </label>
            <label className="block text-sm text-slate-300">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Description</span>
              <textarea
                className={`${inputClass} mt-1.5 min-h-[4.5rem] resize-y`}
                value={value.description}
                onChange={(e) => patch({ description: e.target.value })}
                placeholder="Optional — what this role is for"
                rows={2}
              />
            </label>
            {!ownerLocked ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(value.archived)}
                  onChange={(e) => patch({ archived: e.target.checked })}
                  className="accent-amber-500"
                />
                Archive role (hidden from user assignment)
              </label>
            ) : null}
            <div className="space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Badge look
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Presets, color picker, and style overrides.</p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                  {ROLE_COLORS.map((color) => {
                    const selected = value.color === color;
                    return (
                      <button
                        key={color}
                        type="button"
                        title={color}
                        aria-label={`${color} badge color`}
                        onClick={() => patch({ color })}
                        className={`relative h-8 w-8 rounded-full transition ${
                          selected
                            ? "scale-110 ring-2 ring-amber-300/70 ring-offset-2 ring-offset-slate-950"
                            : "opacity-85 hover:scale-105 hover:opacity-100"
                        }`}
                        style={{
                          background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.55), transparent 40%), ${ROLE_COLOR_HEX[color]}`,
                          boxShadow: `0 0 0 1px ${ROLE_COLOR_HEX[color]}66, 0 6px 14px ${ROLE_COLOR_HEX[color]}33`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 px-3 py-2.5">
                <p className="text-sm font-medium text-slate-200">Base color</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Main fill for the role badge.</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <label className="relative inline-flex h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-inner">
                    <span className="absolute inset-1 rounded-md" style={{ background: colorHex }} />
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => patch({ color: normalizeRoleColor(e.target.value) })}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      aria-label="Base badge color picker"
                    />
                  </label>
                  <input
                    className={`${inputClass} font-mono text-xs uppercase`}
                    value={
                      isHexColor(value.color)
                        ? value.color
                        : isRoleColor(value.color)
                          ? ROLE_COLOR_HEX[value.color]
                          : value.color
                    }
                    onChange={(e) => {
                      const next = e.target.value.trim();
                      patch({
                        color: next.startsWith("#") || isRoleColor(next) ? next : `#${next}`,
                      });
                    }}
                    onBlur={() => {
                      if (isValidRoleColor(value.color)) {
                        patch({ color: normalizeRoleColor(value.color) });
                      }
                    }}
                    placeholder="#RRGGBB"
                    spellCheck={false}
                    aria-label="Base hex color"
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <ColorPickerField
                  label="Text color"
                  hint="Label text on the badge"
                  enabled={Boolean(value.colorStyle?.text)}
                  onEnabledChange={(enabled) => {
                    const next = { ...value.colorStyle };
                    if (enabled) next.text = value.colorStyle?.text || "#ffffff";
                    else delete next.text;
                    patch({ colorStyle: normalizeRoleColorStyle(next) });
                  }}
                  value={value.colorStyle?.text || "#ffffff"}
                  fallback="#ffffff"
                  onChange={(hex) =>
                    patch({
                      colorStyle: normalizeRoleColorStyle({ ...value.colorStyle, text: hex }),
                    })
                  }
                />
                <ColorPickerField
                  label="Border color"
                  hint="Outline around the badge"
                  enabled={Boolean(value.colorStyle?.border)}
                  onEnabledChange={(enabled) => {
                    const next = { ...value.colorStyle };
                    if (enabled) next.border = value.colorStyle?.border || colorHex;
                    else delete next.border;
                    patch({ colorStyle: normalizeRoleColorStyle(next) });
                  }}
                  value={value.colorStyle?.border || colorHex}
                  fallback={value.color}
                  onChange={(hex) =>
                    patch({
                      colorStyle: normalizeRoleColorStyle({ ...value.colorStyle, border: hex }),
                    })
                  }
                />
                <ColorPickerField
                  label="Glow"
                  hint="Soft outer glow around the badge"
                  enabled={Boolean(value.colorStyle?.glowEnabled || value.colorStyle?.glow)}
                  onEnabledChange={(enabled) => {
                    const next: RoleColorStyle = { ...value.colorStyle };
                    if (enabled) {
                      next.glowEnabled = true;
                      next.glow = value.colorStyle?.glow || colorHex;
                    } else {
                      delete next.glowEnabled;
                      delete next.glow;
                    }
                    patch({ colorStyle: normalizeRoleColorStyle(next) });
                  }}
                  value={value.colorStyle?.glow || colorHex}
                  fallback={value.color}
                  onChange={(hex) =>
                    patch({
                      colorStyle: normalizeRoleColorStyle({
                        ...value.colorStyle,
                        glowEnabled: true,
                        glow: hex,
                      }),
                    })
                  }
                />
                <ColorPickerField
                  label="Hover color"
                  hint="Accent when the badge is hovered"
                  enabled={Boolean(value.colorStyle?.hover)}
                  onEnabledChange={(enabled) => {
                    const next = { ...value.colorStyle };
                    if (enabled) next.hover = value.colorStyle?.hover || colorHex;
                    else delete next.hover;
                    patch({ colorStyle: normalizeRoleColorStyle(next) });
                  }}
                  value={value.colorStyle?.hover || colorHex}
                  fallback={value.color}
                  onChange={(hex) =>
                    patch({
                      colorStyle: normalizeRoleColorStyle({ ...value.colorStyle, hover: hex }),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/50 px-4 py-3 text-center shadow-inner shadow-black/30">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
            <p className="mt-1 text-[10px] text-slate-600">Hover to test hover style</p>
            <div className="mt-3 flex justify-center">
              <RoleBadge
                role={(value.id || "custom") as never}
                roleName={value.name.trim() || "Role preview"}
                roleColor={normalizeRoleColor(value.color)}
                roleColorStyle={value.colorStyle}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Permission matrix</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Search and filter by module. Use Workspace toggles to pick exact sidebar pages (e.g. Route manager vs My route today).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "granted", "missing"] as FilterMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilter(mode)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                  filter === mode
                    ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
                    : "border-slate-700/70 bg-slate-900/60 text-slate-400 hover:text-slate-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            className={`${inputClass} pl-10`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search permissions…"
          />
        </label>

        <div className="grid gap-3">
          {visibleModules.map((module) => {
            const selectedCount = module.permissions.filter((permission) => actionSet.has(permission.key)).length;
            const allSelected = selectedCount === module.permissions.length && module.permissions.length > 0;
            const isOpen = Boolean(expanded[module.id]) || Boolean(q);
            return (
              <div key={module.id} className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/35">
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setExpanded((prev) => ({ ...prev, [module.id]: !prev[module.id] }))}
                  >
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition ${isOpen ? "rotate-180" : ""}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-100">{module.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {module.description} · {selectedCount}/{module.permissions.length}
                      </span>
                    </span>
                  </button>
                  {!ownerLocked ? (
                    <button
                      type="button"
                      onClick={() => setModuleAll(module.id, !allSelected)}
                      className="shrink-0 rounded-lg border border-slate-700/70 bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-amber-500/40 hover:text-amber-100"
                    >
                      {allSelected ? "Clear" : "Select all"}
                    </button>
                  ) : null}
                </div>
                {isOpen ? (
                  <div className="flex flex-wrap gap-2 px-4 py-3">
                    {module.permissions.map((permission) => {
                      const checked = ownerLocked || actionSet.has(permission.key);
                      const missingDeps =
                        !ownerLocked && checked && (permission.dependsOn ?? []).filter((dep) => !actionSet.has(dep));
                      return (
                        <label
                          key={permission.key}
                          title={permission.description || permission.key}
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
                            checked
                              ? "border-amber-500/35 bg-amber-500/10 text-amber-50"
                              : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700"
                          } ${ownerLocked ? "cursor-default opacity-90" : ""} ${
                            missingDeps && missingDeps.length ? "ring-1 ring-amber-400/40" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={ownerLocked}
                            onChange={(e) => toggleAction(permission.key, e.target.checked)}
                            className="accent-amber-500"
                          />
                          <span className="font-medium">{permission.label}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
          {!visibleModules.length ? (
            <p className="rounded-xl border border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
              No permissions match this search or filter.
            </p>
          ) : null}
        </div>
      </section>

      {dependencyIssues.length ? (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
          <p className="font-medium">Dependency warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-100/90">
            {dependencyIssues.map((issue) => (
              <li key={issue.key}>
                <code className="text-amber-50">{issue.key}</code> usually needs{" "}
                {issue.missing.map((dep) => (
                  <code key={dep} className="mx-0.5 text-amber-50">
                    {dep}
                  </code>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">This role can…</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {moduleChips.length ? (
            moduleChips.map((label) => (
              <span
                key={label}
                className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-50/95"
              >
                {label}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">No permissions selected yet.</span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {effectiveActions.length} action{effectiveActions.length === 1 ? "" : "s"} ·{" "}
          {tabsFromActions(effectiveActions).length} page
          {tabsFromActions(effectiveActions).length === 1 ? "" : "s"} unlocked
          {value.archived ? " · archived" : ""}
        </p>
      </section>

      {ownerLocked ? (
        <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100/90">
          Founder always keeps full access. You can still rename the badge and change its color.
        </p>
      ) : null}
    </div>
  );
}
