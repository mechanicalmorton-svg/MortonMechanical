"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { ServiceIcon, SiteContent, SectionAlign } from "@/lib/content-types";
import { normalizeContent } from "@/lib/content-normalize";
import {
  createCustomBlock,
  customBlockIdFromSection,
  isCustomSectionId,
  moveArrayItem,
  sectionIdForCustomBlock,
  sectionLabel,
} from "@/lib/page-layout";
import { SITE_CONTENT_BROADCAST } from "@/lib/site-content-live";
import { useAdminToast } from "./AdminToast";
import { PageHeader, btnPrimary, btnSecondary, inputClass } from "./admin-ui";
import { Can, usePermissions } from "./permissions";

const input = `${inputClass} mt-1`;
const textarea = `${inputClass} mt-1 min-h-[80px] resize-y`;

type CategoryId =
  | "layout"
  | "business"
  | "header"
  | "hero"
  | "trust"
  | "services"
  | "how"
  | "about"
  | "reviews"
  | "cta"
  | "contact"
  | "footer"
  | "images"
  | "custom";

const CATEGORIES: { id: CategoryId; label: string; hint: string }[] = [
  { id: "layout", label: "Page layout", hint: "Show, hide, and reorder homepage sections" },
  { id: "business", label: "Business info", hint: "Name, phone, hours, SEO" },
  { id: "header", label: "Header & nav", hint: "Top navigation and buttons" },
  { id: "hero", label: "Hero", hint: "Top banner on the homepage" },
  { id: "trust", label: "Trust bar", hint: "Quick highlights under the hero" },
  { id: "services", label: "Services", hint: "Services section and cards" },
  { id: "how", label: "How it works", hint: "Step-by-step process" },
  { id: "about", label: "About", hint: "About story and why-us cards" },
  { id: "reviews", label: "Reviews", hint: "Customer testimonials" },
  { id: "cta", label: "Call to action", hint: "Bottom quote banner" },
  { id: "custom", label: "Custom sections", hint: "Owner-added homepage blocks" },
  { id: "contact", label: "Contact page", hint: "Quote form and contact labels" },
  { id: "footer", label: "Footer", hint: "Footer link labels" },
  { id: "images", label: "Images", hint: "Image URLs used on the site" },
];

const iconOptions: ServiceIcon[] = ["scan", "calendar", "shield", "cog", "battery", "wind"];
const aligns: SectionAlign[] = ["left", "center", "right"];

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="block text-sm text-slate-300">
      {label}
      {multiline ? (
        <textarea className={textarea} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className={input} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function MoveRow({
  index,
  total,
  onMove,
}: {
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title="Move up"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className="rounded-lg border border-slate-700 p-1.5 text-slate-300 disabled:opacity-30 hover:border-amber-500/40 hover:text-amber-300"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Move down"
        disabled={index >= total - 1}
        onClick={() => onMove(index, index + 1)}
        className="rounded-lg border border-slate-700 p-1.5 text-slate-300 disabled:opacity-30 hover:border-amber-500/40 hover:text-amber-300"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Move left"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className="rounded-lg border border-slate-700 p-1.5 text-slate-300 disabled:opacity-30 hover:border-amber-500/40 hover:text-amber-300"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        title="Move right"
        disabled={index >= total - 1}
        onClick={() => onMove(index, index + 1)}
        className="rounded-lg border border-slate-700 p-1.5 text-slate-300 disabled:opacity-30 hover:border-amber-500/40 hover:text-amber-300"
      >
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ItemShell({
  title,
  index,
  total,
  onMove,
  onDelete,
  children,
}: {
  title: string;
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
          <GripVertical className="h-4 w-4 text-slate-600" />
          {title}
        </div>
        <div className="flex items-center gap-2">
          <MoveRow index={index} total={total} onMove={onMove} />
          {onDelete ? (
            <button type="button" onClick={onDelete} className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function notifySiteUpdated() {
  try {
    const channel = new BroadcastChannel(SITE_CONTENT_BROADCAST);
    channel.postMessage({ type: "updated", at: Date.now() });
    channel.close();
  } catch {
    /* ignore */
  }
}

export function ContentEditor() {
  const toast = useAdminToast();
  const { hasPermission } = usePermissions();
  const canEditContent = hasPermission("content.edit");
  const [content, setContent] = useState<SiteContent | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<CategoryId>("layout");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Could not load site contents.");
        return normalizeContent(data);
      })
      .then((normalized) => {
        setContent(normalized);
        setSavedSnapshot(JSON.stringify(normalized));
        setLoadError("");
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Could not load site contents.");
      })
      .finally(() => setLoading(false));
  }, []);

  function patch(updater: (c: SiteContent) => SiteContent) {
    setContent((c) => (c ? updater(structuredClone(c)) : c));
    setJustSaved(false);
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    setJustSaved(false);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save. Check your edits and try again.");
        return;
      }
      const normalized = normalizeContent(data.content ?? content);
      setContent(normalized);
      setSavedSnapshot(JSON.stringify(normalized));
      notifySiteUpdated();
      setJustSaved(true);
      toast.success(data.message ?? "Saved — your website is updated.");
    } catch {
      toast.error("Could not save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading site contents…</p>;
  }

  if (loadError || !content) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
        {loadError || "Site contents could not be loaded."}
        <p className="mt-2 text-red-200/70">Refresh the page, then reopen Site Contents.</p>
      </div>
    );
  }

  const active = CATEGORIES.find((c) => c.id === category)!;
  const dirty = JSON.stringify(content) !== savedSnapshot;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          title="Site Contents"
          subtitle="Edit your website in plain language. Pick a category, change the text, then press Save — the live site updates right away."
        />
        <div className="flex flex-wrap items-center gap-2">
          <a href="/" target="_blank" rel="noreferrer" className={btnSecondary}>
            <ExternalLink className="h-4 w-4" />
            View website
          </a>
          <Can permission="content.edit">
            <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : dirty ? "Save all changes" : "Saved"}
            </button>
          </Can>
        </div>
      </div>

      {justSaved ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          Website updated. Open{" "}
          <a href="/" target="_blank" rel="noreferrer" className="font-semibold underline decoration-emerald-300/50 underline-offset-2">
            your homepage
          </a>{" "}
          to see the changes — no coding needed.
        </div>
      ) : dirty ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-3 text-sm text-amber-100">
          You have unsaved edits. Press <span className="font-semibold">Save all changes</span> to publish them to the website.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="admin-glass h-fit rounded-2xl p-2 lg:sticky lg:top-20">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Categories
          </p>
          <nav className="space-y-0.5">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={`flex w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  category === item.id
                    ? "bg-amber-500/15 font-medium text-amber-100"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div
          className={`space-y-4 ${canEditContent ? "" : "pointer-events-none select-none"}`}
          aria-readonly={!canEditContent}
        >
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/30 px-5 py-4">
            <h3 className="site-display text-lg font-semibold text-white">{active.label}</h3>
            <p className="mt-1 text-sm text-slate-500">{active.hint}</p>
          </div>

          {category === "layout" && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Drag sections or use the arrows to move them up/down/left/right. Toggle visibility and set left / center / right alignment.
              </p>
              {content.pageLayout.sections.map((section, i) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex === null || dragIndex === i) return;
                    patch((c) => {
                      c.pageLayout.sections = moveArrayItem(c.pageLayout.sections, dragIndex, i);
                      return c;
                    });
                    setDragIndex(null);
                  }}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                >
                  <GripVertical className="h-4 w-4 cursor-grab text-slate-600" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-100">{sectionLabel(content, section.id)}</p>
                    <p className="truncate text-[11px] text-slate-500">{section.id}</p>
                  </div>
                  <select
                    className={`${inputClass} w-28`}
                    value={section.align}
                    onChange={(e) =>
                      patch((c) => {
                        c.pageLayout.sections[i].align = e.target.value as SectionAlign;
                        return c;
                      })
                    }
                  >
                    {aligns.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title={section.enabled ? "Hide on homepage" : "Show on homepage"}
                    onClick={() =>
                      patch((c) => {
                        c.pageLayout.sections[i].enabled = !c.pageLayout.sections[i].enabled;
                        return c;
                      })
                    }
                    className={`rounded-lg border p-2 ${
                      section.enabled
                        ? "border-emerald-500/30 text-emerald-300"
                        : "border-slate-700 text-slate-500"
                    }`}
                  >
                    {section.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <MoveRow
                    index={i}
                    total={content.pageLayout.sections.length}
                    onMove={(from, to) =>
                      patch((c) => {
                        c.pageLayout.sections = moveArrayItem(c.pageLayout.sections, from, to);
                        return c;
                      })
                    }
                  />
                  {isCustomSectionId(section.id) ? (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                      onClick={() =>
                        patch((c) => {
                          const blockId = customBlockIdFromSection(section.id);
                          c.customBlocks = c.customBlocks.filter((b) => b.id !== blockId);
                          c.pageLayout.sections = c.pageLayout.sections.filter((s) => s.id !== section.id);
                          return c;
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch((c) => {
                    const block = createCustomBlock();
                    c.customBlocks.push(block);
                    c.pageLayout.sections.push({
                      id: sectionIdForCustomBlock(block.id),
                      enabled: true,
                      align: "left",
                    });
                    return c;
                  })
                }
                className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
              >
                <Plus className="h-4 w-4" /> Add custom section to homepage
              </button>
            </div>
          )}

          {category === "business" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business name" value={content.site.name} onChange={(v) => patch((c) => { c.site.name = v; return c; })} />
                <Field label="Phone" value={content.site.phone} onChange={(v) => patch((c) => { c.site.phone = v; return c; })} />
                <Field label="Email" value={content.site.email} onChange={(v) => patch((c) => { c.site.email = v; return c; })} />
                <Field label="Address / service area label" value={content.site.address} onChange={(v) => patch((c) => { c.site.address = v; return c; })} />
              </div>
              <Field label="Tagline" value={content.site.tagline} onChange={(v) => patch((c) => { c.site.tagline = v; return c; })} />
              <Field label="Description (SEO & footer)" value={content.site.description} onChange={(v) => patch((c) => { c.site.description = v; return c; })} multiline />
              <Field label="Service area note" value={content.site.serviceArea} onChange={(v) => patch((c) => { c.site.serviceArea = v; return c; })} />
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-300">Business hours</p>
                {content.site.hours.map((h, i) => (
                  <ItemShell
                    key={i}
                    title={`Hours ${i + 1}`}
                    index={i}
                    total={content.site.hours.length}
                    onMove={(from, to) => patch((c) => { c.site.hours = moveArrayItem(c.site.hours, from, to); return c; })}
                    onDelete={() => patch((c) => { c.site.hours.splice(i, 1); return c; })}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={input} value={h.days} placeholder="Days" onChange={(e) => patch((c) => { c.site.hours[i].days = e.target.value; return c; })} />
                      <input className={input} value={h.time} placeholder="Hours" onChange={(e) => patch((c) => { c.site.hours[i].time = e.target.value; return c; })} />
                    </div>
                  </ItemShell>
                ))}
                <button type="button" onClick={() => patch((c) => { c.site.hours.push({ days: "New days", time: "Hours" }); return c; })} className="inline-flex items-center gap-1 text-sm text-amber-400">
                  <Plus className="h-4 w-4" /> Add hours row
                </button>
              </div>
            </div>
          )}

          {category === "header" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Call button text" value={content.header.callButtonText} onChange={(v) => patch((c) => { c.header.callButtonText = v; return c; })} />
                <Field label="Portal button text" value={content.header.portalButtonText} onChange={(v) => patch((c) => { c.header.portalButtonText = v; return c; })} />
                <Field label="Quote button text" value={content.header.quoteButtonText} onChange={(v) => patch((c) => { c.header.quoteButtonText = v; return c; })} />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-300">Navigation links</p>
                {content.header.nav.map((item, i) => (
                  <ItemShell
                    key={i}
                    title={`Link ${i + 1}`}
                    index={i}
                    total={content.header.nav.length}
                    onMove={(from, to) => patch((c) => { c.header.nav = moveArrayItem(c.header.nav, from, to); return c; })}
                    onDelete={() => patch((c) => { c.header.nav.splice(i, 1); return c; })}
                  >
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className={input} value={item.label} placeholder="Label" onChange={(e) => patch((c) => { c.header.nav[i].label = e.target.value; return c; })} />
                      <input className={input} value={item.href} placeholder="/#services" onChange={(e) => patch((c) => { c.header.nav[i].href = e.target.value; return c; })} />
                    </div>
                  </ItemShell>
                ))}
                <button type="button" onClick={() => patch((c) => { c.header.nav.push({ label: "New link", href: "/#section" }); return c; })} className="inline-flex items-center gap-1 text-sm text-amber-400">
                  <Plus className="h-4 w-4" /> Add nav link
                </button>
              </div>
            </div>
          )}

          {category === "hero" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <Field label="Eyebrow" value={content.hero.eyebrow} onChange={(v) => patch((c) => { c.hero.eyebrow = v; return c; })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title line 1" value={content.hero.title} onChange={(v) => patch((c) => { c.hero.title = v; return c; })} />
                <Field label="Title highlight" value={content.hero.titleHighlight} onChange={(v) => patch((c) => { c.hero.titleHighlight = v; return c; })} />
              </div>
              <Field label="Description" value={content.hero.description} onChange={(v) => patch((c) => { c.hero.description = v; return c; })} multiline />
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-300">Bullet points</p>
                {content.hero.bullets.map((b, i) => (
                  <ItemShell
                    key={i}
                    title={`Bullet ${i + 1}`}
                    index={i}
                    total={content.hero.bullets.length}
                    onMove={(from, to) => patch((c) => { c.hero.bullets = moveArrayItem(c.hero.bullets, from, to); return c; })}
                    onDelete={() => patch((c) => { c.hero.bullets.splice(i, 1); return c; })}
                  >
                    <input className={input} value={b} onChange={(e) => patch((c) => { c.hero.bullets[i] = e.target.value; return c; })} />
                  </ItemShell>
                ))}
                <button type="button" onClick={() => patch((c) => { c.hero.bullets.push("New bullet point"); return c; })} className="inline-flex items-center gap-1 text-sm text-amber-400">
                  <Plus className="h-4 w-4" /> Add bullet
                </button>
              </div>
              <Field label="Image caption" value={content.hero.imageCaption} onChange={(v) => patch((c) => { c.hero.imageCaption = v; return c; })} />
              <Field label="Image subcaption" value={content.hero.imageSubcaption} onChange={(v) => patch((c) => { c.hero.imageSubcaption = v; return c; })} />
              <Field label="Hero image alt text" value={content.hero.imageAlt} onChange={(v) => patch((c) => { c.hero.imageAlt = v; return c; })} />
            </div>
          )}

          {category === "trust" && (
            <div className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              {content.trustBar.map((item, i) => (
                <ItemShell
                  key={i}
                  title={`Trust item ${i + 1}`}
                  index={i}
                  total={content.trustBar.length}
                  onMove={(from, to) => patch((c) => { c.trustBar = moveArrayItem(c.trustBar, from, to); return c; })}
                  onDelete={() => patch((c) => { c.trustBar.splice(i, 1); return c; })}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={input} value={item.label} placeholder="Label" onChange={(e) => patch((c) => { c.trustBar[i].label = e.target.value; return c; })} />
                    <input className={input} value={item.detail} placeholder="Detail" onChange={(e) => patch((c) => { c.trustBar[i].detail = e.target.value; return c; })} />
                  </div>
                </ItemShell>
              ))}
              <button type="button" onClick={() => patch((c) => { c.trustBar.push({ label: "New item", detail: "Detail text" }); return c; })} className="inline-flex items-center gap-1 text-sm text-amber-400">
                <Plus className="h-4 w-4" /> Add trust item
              </button>
            </div>
          )}

          {category === "services" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <Field label="Section anchor ID" value={content.sections.services.anchorId} onChange={(v) => patch((c) => { c.sections.services.anchorId = v; return c; })} />
              <Field label="Section label" value={content.sections.services.label} onChange={(v) => patch((c) => { c.sections.services.label = v; return c; })} />
              <Field label="Section title" value={content.sections.services.title} onChange={(v) => patch((c) => { c.sections.services.title = v; return c; })} />
              <Field label="Section subtitle" value={content.sections.services.subtitle} onChange={(v) => patch((c) => { c.sections.services.subtitle = v; return c; })} />
              <Field label="Banner text" value={content.sections.services.bannerText} onChange={(v) => patch((c) => { c.sections.services.bannerText = v; return c; })} multiline />
              {content.services.map((s, i) => (
                <ItemShell
                  key={s.id}
                  title={s.title || `Service ${i + 1}`}
                  index={i}
                  total={content.services.length}
                  onMove={(from, to) => patch((c) => { c.services = moveArrayItem(c.services, from, to); return c; })}
                  onDelete={() => patch((c) => { c.services.splice(i, 1); return c; })}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Title" value={s.title} onChange={(v) => patch((c) => { c.services[i].title = v; return c; })} />
                    <label className="block text-sm text-slate-300">
                      Icon
                      <select className={input} value={s.icon} onChange={(e) => patch((c) => { c.services[i].icon = e.target.value as ServiceIcon; return c; })}>
                        {iconOptions.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <Field label="Description" value={s.description} onChange={(v) => patch((c) => { c.services[i].description = v; return c; })} multiline />
                </ItemShell>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch((c) => {
                    c.services.push({ id: `service-${Date.now()}`, title: "New service", description: "Describe this service.", icon: "cog" });
                    return c;
                  })
                }
                className="inline-flex items-center gap-1 text-sm text-amber-400"
              >
                <Plus className="h-4 w-4" /> Add service
              </button>
            </div>
          )}

          {category === "how" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <Field label="Section anchor ID" value={content.sections.howItWorks.anchorId} onChange={(v) => patch((c) => { c.sections.howItWorks.anchorId = v; return c; })} />
              <Field label="Section label" value={content.sections.howItWorks.label} onChange={(v) => patch((c) => { c.sections.howItWorks.label = v; return c; })} />
              <Field label="Section title" value={content.sections.howItWorks.title} onChange={(v) => patch((c) => { c.sections.howItWorks.title = v; return c; })} />
              <Field label="Section subtitle" value={content.sections.howItWorks.subtitle} onChange={(v) => patch((c) => { c.sections.howItWorks.subtitle = v; return c; })} />
              {content.howItWorks.map((step, i) => (
                <ItemShell
                  key={i}
                  title={step.title || `Step ${i + 1}`}
                  index={i}
                  total={content.howItWorks.length}
                  onMove={(from, to) => patch((c) => { c.howItWorks = moveArrayItem(c.howItWorks, from, to); return c; })}
                  onDelete={() => patch((c) => { c.howItWorks.splice(i, 1); return c; })}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Step number" value={step.step} onChange={(v) => patch((c) => { c.howItWorks[i].step = v; return c; })} />
                    <Field label="Title" value={step.title} onChange={(v) => patch((c) => { c.howItWorks[i].title = v; return c; })} />
                  </div>
                  <Field label="Text" value={step.text} onChange={(v) => patch((c) => { c.howItWorks[i].text = v; return c; })} multiline />
                </ItemShell>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch((c) => {
                    c.howItWorks.push({ step: String(c.howItWorks.length + 1).padStart(2, "0"), title: "New step", text: "Describe this step." });
                    return c;
                  })
                }
                className="inline-flex items-center gap-1 text-sm text-amber-400"
              >
                <Plus className="h-4 w-4" /> Add step
              </button>
            </div>
          )}

          {category === "about" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <Field label="Section anchor ID" value={content.about.anchorId} onChange={(v) => patch((c) => { c.about.anchorId = v; return c; })} />
              <Field label="Section label" value={content.about.label} onChange={(v) => patch((c) => { c.about.label = v; return c; })} />
              <Field label="Section title" value={content.about.title} onChange={(v) => patch((c) => { c.about.title = v; return c; })} />
              <Field label="Section subtitle" value={content.about.subtitle} onChange={(v) => patch((c) => { c.about.subtitle = v; return c; })} />
              <Field label="Paragraph 1" value={content.about.paragraph1} onChange={(v) => patch((c) => { c.about.paragraph1 = v; return c; })} multiline />
              <Field label="Paragraph 2" value={content.about.paragraph2} onChange={(v) => patch((c) => { c.about.paragraph2 = v; return c; })} multiline />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Badge value" value={content.about.badgeValue} onChange={(v) => patch((c) => { c.about.badgeValue = v; return c; })} />
                <Field label="Badge label" value={content.about.badgeLabel} onChange={(v) => patch((c) => { c.about.badgeLabel = v; return c; })} />
              </div>
              <Field label="About image alt text" value={content.about.imageAlt} onChange={(v) => patch((c) => { c.about.imageAlt = v; return c; })} />
              <p className="text-sm font-medium text-slate-300">Why choose us</p>
              {content.whyUs.map((item, i) => (
                <ItemShell
                  key={i}
                  title={item.title || `Reason ${i + 1}`}
                  index={i}
                  total={content.whyUs.length}
                  onMove={(from, to) => patch((c) => { c.whyUs = moveArrayItem(c.whyUs, from, to); return c; })}
                  onDelete={() => patch((c) => { c.whyUs.splice(i, 1); return c; })}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input className={input} value={item.title} placeholder="Title" onChange={(e) => patch((c) => { c.whyUs[i].title = e.target.value; return c; })} />
                    <input className={input} value={item.text} placeholder="Text" onChange={(e) => patch((c) => { c.whyUs[i].text = e.target.value; return c; })} />
                  </div>
                </ItemShell>
              ))}
              <button type="button" onClick={() => patch((c) => { c.whyUs.push({ title: "New reason", text: "Why customers choose you." }); return c; })} className="inline-flex items-center gap-1 text-sm text-amber-400">
                <Plus className="h-4 w-4" /> Add card
              </button>
            </div>
          )}

          {category === "reviews" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <Field label="Section anchor ID" value={content.sections.testimonials.anchorId} onChange={(v) => patch((c) => { c.sections.testimonials.anchorId = v; return c; })} />
              <Field label="Section label" value={content.sections.testimonials.label} onChange={(v) => patch((c) => { c.sections.testimonials.label = v; return c; })} />
              <Field label="Section title" value={content.sections.testimonials.title} onChange={(v) => patch((c) => { c.sections.testimonials.title = v; return c; })} />
              <Field label="Section subtitle" value={content.sections.testimonials.subtitle} onChange={(v) => patch((c) => { c.sections.testimonials.subtitle = v; return c; })} />
              {content.testimonials.map((t, i) => (
                <ItemShell
                  key={i}
                  title={t.name || `Review ${i + 1}`}
                  index={i}
                  total={content.testimonials.length}
                  onMove={(from, to) => patch((c) => { c.testimonials = moveArrayItem(c.testimonials, from, to); return c; })}
                  onDelete={() => patch((c) => { c.testimonials.splice(i, 1); return c; })}
                >
                  <Field label="Quote" value={t.quote} onChange={(v) => patch((c) => { c.testimonials[i].quote = v; return c; })} multiline />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field label="Name" value={t.name} onChange={(v) => patch((c) => { c.testimonials[i].name = v; return c; })} />
                    <Field label="Location" value={t.location} onChange={(v) => patch((c) => { c.testimonials[i].location = v; return c; })} />
                  </div>
                </ItemShell>
              ))}
              <button type="button" onClick={() => patch((c) => { c.testimonials.push({ quote: "Great service!", name: "Customer", location: "Local" }); return c; })} className="inline-flex items-center gap-1 text-sm text-amber-400">
                <Plus className="h-4 w-4" /> Add review
              </button>
            </div>
          )}

          {category === "cta" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <Field label="Title" value={content.cta.title} onChange={(v) => patch((c) => { c.cta.title = v; return c; })} />
              <Field label="Description" value={content.cta.description} onChange={(v) => patch((c) => { c.cta.description = v; return c; })} multiline />
              <Field label="Button text" value={content.cta.buttonText} onChange={(v) => patch((c) => { c.cta.buttonText = v; return c; })} />
            </div>
          )}

          {category === "custom" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <p className="text-xs text-slate-500">
                Custom sections also appear under Page layout so you can place them anywhere on the homepage.
              </p>
              {content.customBlocks.length === 0 ? (
                <p className="text-sm text-slate-500">No custom sections yet.</p>
              ) : null}
              {content.customBlocks.map((block, i) => (
                <ItemShell
                  key={block.id}
                  title={block.title || `Custom ${i + 1}`}
                  index={i}
                  total={content.customBlocks.length}
                  onMove={(from, to) =>
                    patch((c) => {
                      c.customBlocks = moveArrayItem(c.customBlocks, from, to);
                      return c;
                    })
                  }
                  onDelete={() =>
                    patch((c) => {
                      const sid = sectionIdForCustomBlock(block.id);
                      c.customBlocks = c.customBlocks.filter((b) => b.id !== block.id);
                      c.pageLayout.sections = c.pageLayout.sections.filter((s) => s.id !== sid);
                      return c;
                    })
                  }
                >
                  <Field label="Title" value={block.title} onChange={(v) => patch((c) => { c.customBlocks[i].title = v; return c; })} />
                  <Field label="Body" value={block.body} onChange={(v) => patch((c) => { c.customBlocks[i].body = v; return c; })} multiline />
                  <Field label="Image URL (optional)" value={block.imageUrl} onChange={(v) => patch((c) => { c.customBlocks[i].imageUrl = v; return c; })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Button text (optional)" value={block.buttonText} onChange={(v) => patch((c) => { c.customBlocks[i].buttonText = v; return c; })} />
                    <Field label="Button link" value={block.buttonHref} onChange={(v) => patch((c) => { c.customBlocks[i].buttonHref = v; return c; })} />
                  </div>
                </ItemShell>
              ))}
              <button
                type="button"
                onClick={() =>
                  patch((c) => {
                    const block = createCustomBlock();
                    c.customBlocks.push(block);
                    c.pageLayout.sections.push({ id: sectionIdForCustomBlock(block.id), enabled: true, align: "left" });
                    return c;
                  })
                }
                className="inline-flex items-center gap-1 text-sm text-amber-400"
              >
                <Plus className="h-4 w-4" /> Add custom section
              </button>
            </div>
          )}

          {category === "contact" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <Field label="Page title" value={content.pages.contactTitle} onChange={(v) => patch((c) => { c.pages.contactTitle = v; return c; })} />
              <Field label="Page subtitle" value={content.pages.contactSubtitle} onChange={(v) => patch((c) => { c.pages.contactSubtitle = v; return c; })} multiline />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sidebar: details heading" value={content.pages.sidebarDetailsTitle} onChange={(v) => patch((c) => { c.pages.sidebarDetailsTitle = v; return c; })} />
                <Field label="Sidebar: why book heading" value={content.pages.sidebarWhyTitle} onChange={(v) => patch((c) => { c.pages.sidebarWhyTitle = v; return c; })} />
                <Field label="Phone label" value={content.pages.phoneLabel} onChange={(v) => patch((c) => { c.pages.phoneLabel = v; return c; })} />
                <Field label="Email label" value={content.pages.emailLabel} onChange={(v) => patch((c) => { c.pages.emailLabel = v; return c; })} />
                <Field label="Location label" value={content.pages.locationLabel} onChange={(v) => patch((c) => { c.pages.locationLabel = v; return c; })} />
                <Field label="Hours label" value={content.pages.hoursLabel} onChange={(v) => patch((c) => { c.pages.hoursLabel = v; return c; })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Form submit button" value={content.pages.form.submitText} onChange={(v) => patch((c) => { c.pages.form.submitText = v; return c; })} />
                <Field label="Form success title" value={content.pages.form.successTitle} onChange={(v) => patch((c) => { c.pages.form.successTitle = v; return c; })} />
              </div>
              <Field label="Form success message" value={content.pages.form.successMessage} onChange={(v) => patch((c) => { c.pages.form.successMessage = v; return c; })} multiline />
              <Field label="Form footer note" value={content.pages.form.footerNote} onChange={(v) => patch((c) => { c.pages.form.footerNote = v; return c; })} />
              <p className="text-sm font-medium text-slate-300">Quote form service options</p>
              {content.serviceOptions.map((opt, i) => (
                <ItemShell
                  key={i}
                  title={`Option ${i + 1}`}
                  index={i}
                  total={content.serviceOptions.length}
                  onMove={(from, to) => patch((c) => { c.serviceOptions = moveArrayItem(c.serviceOptions, from, to); return c; })}
                  onDelete={() => patch((c) => { c.serviceOptions.splice(i, 1); return c; })}
                >
                  <input className={input} value={opt} onChange={(e) => patch((c) => { c.serviceOptions[i] = e.target.value; return c; })} />
                </ItemShell>
              ))}
              <button type="button" onClick={() => patch((c) => { c.serviceOptions.push("New option"); return c; })} className="inline-flex items-center gap-1 text-sm text-amber-400">
                <Plus className="h-4 w-4" /> Add option
              </button>
            </div>
          )}

          {category === "footer" && (
            <div className="grid gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5 sm:grid-cols-2">
              <Field label="Privacy link text" value={content.footer.privacyLabel} onChange={(v) => patch((c) => { c.footer.privacyLabel = v; return c; })} />
              <Field label="Terms link text" value={content.footer.termsLabel} onChange={(v) => patch((c) => { c.footer.termsLabel = v; return c; })} />
              <Field label="Contact link text" value={content.footer.contactLabel} onChange={(v) => patch((c) => { c.footer.contactLabel = v; return c; })} />
              <Field label="Portal link text" value={content.footer.staffLoginLabel} onChange={(v) => patch((c) => { c.footer.staffLoginLabel = v; return c; })} />
            </div>
          )}

          {category === "images" && (
            <div className="space-y-4 rounded-2xl border border-slate-800/70 bg-slate-900/20 p-5">
              <p className="text-xs text-slate-500">Use direct image URLs (for example Unsplash). Hosts must be allowed in next.config.</p>
              <Field label="Hero image" value={content.images.hero} onChange={(v) => patch((c) => { c.images.hero = v; return c; })} />
              <Field label="About image" value={content.images.about} onChange={(v) => patch((c) => { c.images.about = v; return c; })} />
              <Field label="Services banner" value={content.images.services} onChange={(v) => patch((c) => { c.images.services = v; return c; })} />
              <Field label="Contact / CTA image" value={content.images.contact} onChange={(v) => patch((c) => { c.images.contact = v; return c; })} />
            </div>
          )}

          <div className="sticky bottom-4 flex flex-wrap justify-end gap-2">
            <a href="/" target="_blank" rel="noreferrer" className={btnSecondary}>
              <ExternalLink className="h-4 w-4" />
              View website
            </a>
            <Can permission="content.edit">
              <button type="button" onClick={save} disabled={saving || !dirty} className={btnPrimary}>
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : dirty ? "Save all changes" : "Saved"}
              </button>
            </Can>
          </div>
        </div>
      </div>
    </div>
  );
}
