"use client";

import {
  PERMISSION_PAGE_GROUPS,
  ROLE_COLORS,
  ROLE_COLOR_HEX,
  dashboardTabLabel,
  isHexColor,
  isRoleColor,
  isValidRoleColor,
  normalizeRoleColor,
  resolveRoleColorHex,
  toggleTabsInSet,
} from "@/lib/role-definitions";
import { RoleBadge, inputClass } from "./admin-ui";

export type RoleAccessFormState = {
  id: string;
  name: string;
  color: string;
  tabs: string[];
  manageUsers: boolean;
  editSiteContent: boolean;
};

type Props = {
  value: RoleAccessFormState;
  onChange: (next: RoleAccessFormState) => void;
  ownerLocked?: boolean;
};

function groupSelectionState(tabs: string[], pageIds: string[]) {
  const selected = pageIds.filter((id) => tabs.includes(id)).length;
  if (selected === 0) return "none" as const;
  if (selected === pageIds.length) return "all" as const;
  return "partial" as const;
}

export function RoleAccessEditor({ value, onChange, ownerLocked = false }: Props) {
  const effectiveTabs = ownerLocked
    ? PERMISSION_PAGE_GROUPS.flatMap((group) => group.pages.map((page) => page.id))
    : value.tabs;

  const previewLabels = [
    ...effectiveTabs.map(dashboardTabLabel),
    ...(value.manageUsers || ownerLocked ? ["Manage users"] : []),
    ...(value.editSiteContent || ownerLocked ? ["Edit site contents"] : []),
  ];

  function patch(partial: Partial<RoleAccessFormState>) {
    onChange({ ...value, ...partial });
  }

  function setTab(tabId: string, enabled: boolean) {
    if (ownerLocked) return;
    if (tabId === "users" && value.manageUsers && !enabled) return;
    if (tabId === "site-contents" && value.editSiteContent && !enabled) return;
    patch({ tabs: toggleTabsInSet(value.tabs, [tabId], enabled) });
  }

  function setGroup(pageIds: string[], enabled: boolean) {
    if (ownerLocked) return;
    let next = toggleTabsInSet(value.tabs, pageIds, enabled);
    if (value.manageUsers && !next.includes("users")) next = [...next, "users"];
    if (value.editSiteContent && !next.includes("site-contents")) next = [...next, "site-contents"];
    patch({ tabs: next });
  }

  const colorHex = resolveRoleColorHex(value.color);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/80 via-slate-950/60 to-slate-950/90 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block text-sm text-slate-300">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Role name
              </span>
              <input
                className={`${inputClass} mt-1.5`}
                value={value.name}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="e.g. Service Advisor"
                required
              />
            </label>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Badge color
              </p>
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
                <label className="relative ml-1 inline-flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-slate-600 bg-slate-900/70 transition hover:border-amber-400/50">
                  <span className="pointer-events-none absolute inset-[3px] rounded-full" style={{ background: colorHex }} />
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => patch({ color: normalizeRoleColor(e.target.value) })}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Custom badge color"
                  />
                </label>
                <input
                  className={`${inputClass} max-w-[7.5rem] font-mono text-xs uppercase`}
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
                  aria-label="Hex color"
                />
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/60 bg-slate-950/50 px-4 py-3 text-center shadow-inner shadow-black/30">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preview</p>
            <div className="mt-2 flex justify-center">
              <RoleBadge
                role={(value.id || "custom") as never}
                roleName={value.name.trim() || "Role preview"}
                roleColor={normalizeRoleColor(value.color)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Page access</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Choose exactly which dashboard pages this role can open. Unchecked pages stay hidden from their sidebar.
          </p>
        </div>

        <div className="grid gap-3">
          {PERMISSION_PAGE_GROUPS.map((group) => {
            const pageIds = group.pages.map((page) => page.id);
            const selection = groupSelectionState(effectiveTabs, pageIds);
            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/35"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/70 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-100">{group.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{group.description}</p>
                  </div>
                  {group.selectableAll && !ownerLocked ? (
                    <button
                      type="button"
                      onClick={() => setGroup(pageIds, selection !== "all")}
                      className="shrink-0 rounded-lg border border-slate-700/70 bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 transition hover:border-amber-500/40 hover:text-amber-100"
                    >
                      {selection === "all" ? "Clear" : "Select all"}
                    </button>
                  ) : null}
                </div>
                <div className="divide-y divide-slate-800/60">
                  {group.pages.map((page) => {
                    const lockedByCapability =
                      (page.id === "users" && (value.manageUsers || ownerLocked)) ||
                      (page.id === "site-contents" && (value.editSiteContent || ownerLocked));
                    const checked = ownerLocked || effectiveTabs.includes(page.id) || lockedByCapability;
                    const disabled = ownerLocked || lockedByCapability;
                    return (
                      <label
                        key={page.id}
                        className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition ${
                          checked
                            ? "bg-amber-500/[0.07]"
                            : "hover:bg-slate-900/50"
                        } ${disabled ? "cursor-default" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => setTab(page.id, e.target.checked)}
                          className="mt-1 accent-amber-500"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-medium ${checked ? "text-amber-50" : "text-slate-200"}`}>
                              {page.label}
                            </span>
                            {lockedByCapability ? (
                              <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100/90">
                                Required
                              </span>
                            ) : null}
                          </span>
                          {page.description ? (
                            <span className="mt-0.5 block text-xs text-slate-500">{page.description}</span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Capabilities</h3>
          <p className="mt-1 text-xs text-slate-500">
            Extra powers beyond viewing a page. Turning these on also unlocks the matching page.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
              value.manageUsers || ownerLocked
                ? "border-violet-400/30 bg-violet-500/10"
                : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
            } ${ownerLocked ? "cursor-default opacity-90" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={ownerLocked || value.manageUsers}
              disabled={ownerLocked}
              onChange={(e) =>
                patch({
                  manageUsers: e.target.checked,
                  tabs: e.target.checked
                    ? toggleTabsInSet(value.tabs, ["users"], true)
                    : value.tabs,
                })
              }
              className="mt-1 accent-violet-400"
            />
            <span>
              <span className="block text-sm font-medium text-slate-100">Manage users & roles</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Create staff, edit roles, and open User Management.
              </span>
            </span>
          </label>
          <label
            className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
              value.editSiteContent || ownerLocked
                ? "border-fuchsia-400/30 bg-fuchsia-500/10"
                : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
            } ${ownerLocked ? "cursor-default opacity-90" : "cursor-pointer"}`}
          >
            <input
              type="checkbox"
              checked={ownerLocked || value.editSiteContent}
              disabled={ownerLocked}
              onChange={(e) =>
                patch({
                  editSiteContent: e.target.checked,
                  tabs: e.target.checked
                    ? toggleTabsInSet(value.tabs, ["site-contents"], true)
                    : value.tabs,
                })
              }
              className="mt-1 accent-fuchsia-400"
            />
            <span>
              <span className="block text-sm font-medium text-slate-100">Edit site contents</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Change public website copy, contact info, and homepage content.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800/80 bg-slate-950/40 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          This role can open
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {previewLabels.length ? (
            previewLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-50/95"
              >
                {label}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-500">No pages selected yet.</span>
          )}
        </div>
      </section>

      {ownerLocked ? (
        <p className="rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2 text-xs text-sky-100/90">
          Founder always keeps full access. You can still rename the badge and change its color.
        </p>
      ) : null}
    </div>
  );
}
