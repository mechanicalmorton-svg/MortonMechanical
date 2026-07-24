"use client";

import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { ServiceIcon, SiteContent } from "@/lib/content-types";
import { normalizeContent } from "@/lib/content-normalize";
import { useAdminToast } from "./AdminToast";
import { PageHeader, btnPrimary, inputClass } from "./admin-ui";

const input = `${inputClass} mt-1`;
const textarea = `${inputClass} mt-1 min-h-[80px] resize-y`;

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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-800 bg-slate-900/40" open>
      <summary className="cursor-pointer list-none px-5 py-4 font-semibold text-white marker:content-none [&::-webkit-details-marker]:hidden">
        {title}
      </summary>
      <div className="space-y-4 border-t border-slate-800 px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}

const iconOptions: ServiceIcon[] = ["scan", "calendar", "shield", "cog", "battery", "wind"];

export function ContentEditor() {
  const toast = useAdminToast();
  const [content, setContent] = useState<SiteContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((r) => r.json())
      .then((data) => setContent(normalizeContent(data)))
      .finally(() => setLoading(false));
  }, []);

  function patch(updater: (c: SiteContent) => SiteContent) {
    setContent((c) => (c ? updater(structuredClone(c)) : c));
  }

  async function save() {
    if (!content) return;
    setSaving(true);
    const res = await fetch("/api/admin/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not save.");
      return;
    }
    setContent(normalizeContent(data.content ?? data));
    toast.success("Site contents saved. Changes are live on your website.");
  }

  if (loading || !content) {
    return <p className="text-sm text-slate-500">Loading site contents…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Site Contents" subtitle="Customize every section of your public homepage. Save when you're done." />
        <button type="button" onClick={save} disabled={saving} className={btnPrimary}>
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="space-y-4">
        <Panel title="Business info">
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
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  className={input}
                  value={h.days}
                  placeholder="Days"
                  onChange={(e) =>
                    patch((c) => {
                      c.site.hours[i].days = e.target.value;
                      return c;
                    })
                  }
                />
                <input
                  className={input}
                  value={h.time}
                  placeholder="Hours"
                  onChange={(e) =>
                    patch((c) => {
                      c.site.hours[i].time = e.target.value;
                      return c;
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => patch((c) => { c.site.hours.splice(i, 1); return c; })}
                  className="self-end text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patch((c) => { c.site.hours.push({ days: "New days", time: "Hours" }); return c; })}
              className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
            >
              <Plus className="h-4 w-4" /> Add hours row
            </button>
          </div>
        </Panel>

        <Panel title="Header & navigation">
          <p className="text-xs text-slate-500">
            Nav links like <code className="text-amber-400">/#services</code> must match each section&apos;s anchor ID below.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Call button text" value={content.header.callButtonText} onChange={(v) => patch((c) => { c.header.callButtonText = v; return c; })} />
            <Field label="Portal button text" value={content.header.portalButtonText} onChange={(v) => patch((c) => { c.header.portalButtonText = v; return c; })} />
            <Field label="Quote button text" value={content.header.quoteButtonText} onChange={(v) => patch((c) => { c.header.quoteButtonText = v; return c; })} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Navigation links</p>
            {content.header.nav.map((item, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input className={input} value={item.label} placeholder="Label" onChange={(e) => patch((c) => { c.header.nav[i].label = e.target.value; return c; })} />
                <input className={input} value={item.href} placeholder="Link (e.g. /#services)" onChange={(e) => patch((c) => { c.header.nav[i].href = e.target.value; return c; })} />
                <button type="button" onClick={() => patch((c) => { c.header.nav.splice(i, 1); return c; })} className="self-end text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patch((c) => { c.header.nav.push({ label: "New link", href: "/#section" }); return c; })}
              className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
            >
              <Plus className="h-4 w-4" /> Add nav link
            </button>
          </div>
        </Panel>

        <Panel title="Hero section">
          <p className="text-xs text-slate-500">
            Primary and call buttons use the same text as Header &amp; navigation (Quote / Call buttons).
          </p>
          <Field label="Eyebrow" value={content.hero.eyebrow} onChange={(v) => patch((c) => { c.hero.eyebrow = v; return c; })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title line 1" value={content.hero.title} onChange={(v) => patch((c) => { c.hero.title = v; return c; })} />
            <Field label="Title highlight" value={content.hero.titleHighlight} onChange={(v) => patch((c) => { c.hero.titleHighlight = v; return c; })} />
          </div>
          <Field label="Description" value={content.hero.description} onChange={(v) => patch((c) => { c.hero.description = v; return c; })} multiline />
          <div className="space-y-2">
            <p className="text-sm text-slate-300">Bullet points</p>
            {content.hero.bullets.map((b, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={input}
                  value={b}
                  onChange={(e) =>
                    patch((c) => {
                      c.hero.bullets[i] = e.target.value;
                      return c;
                    })
                  }
                />
                <button type="button" onClick={() => patch((c) => { c.hero.bullets.splice(i, 1); return c; })} className="shrink-0 text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patch((c) => { c.hero.bullets.push("New bullet point"); return c; })}
              className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
            >
              <Plus className="h-4 w-4" /> Add bullet
            </button>
          </div>
          <Field label="Image caption" value={content.hero.imageCaption} onChange={(v) => patch((c) => { c.hero.imageCaption = v; return c; })} />
          <Field label="Image subcaption" value={content.hero.imageSubcaption} onChange={(v) => patch((c) => { c.hero.imageSubcaption = v; return c; })} />
          <Field label="Hero image alt text" value={content.hero.imageAlt} onChange={(v) => patch((c) => { c.hero.imageAlt = v; return c; })} />
        </Panel>

        <Panel title="Trust bar">
          {content.trustBar.map((item, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                className={input}
                value={item.label}
                placeholder="Label"
                onChange={(e) =>
                  patch((c) => {
                    c.trustBar[i].label = e.target.value;
                    return c;
                  })
                }
              />
              <input
                className={input}
                value={item.detail}
                placeholder="Detail"
                onChange={(e) =>
                  patch((c) => {
                    c.trustBar[i].detail = e.target.value;
                    return c;
                  })
                }
              />
              <button type="button" onClick={() => patch((c) => { c.trustBar.splice(i, 1); return c; })} className="self-end text-red-400 hover:text-red-300">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => patch((c) => { c.trustBar.push({ label: "New item", detail: "Detail text" }); return c; })}
            className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
          >
            <Plus className="h-4 w-4" /> Add trust bar item
          </button>
        </Panel>

        <Panel title="Services section">
          <Field label="Section anchor ID" value={content.sections.services.anchorId} onChange={(v) => patch((c) => { c.sections.services.anchorId = v; return c; })} />
          <Field label="Section label" value={content.sections.services.label} onChange={(v) => patch((c) => { c.sections.services.label = v; return c; })} />
          <Field label="Section title" value={content.sections.services.title} onChange={(v) => patch((c) => { c.sections.services.title = v; return c; })} />
          <Field label="Section subtitle" value={content.sections.services.subtitle} onChange={(v) => patch((c) => { c.sections.services.subtitle = v; return c; })} />
          <Field label="Banner text" value={content.sections.services.bannerText} onChange={(v) => patch((c) => { c.sections.services.bannerText = v; return c; })} multiline />
          <div className="space-y-4">
            {content.services.map((s, i) => (
              <div key={s.id} className="rounded-lg border border-slate-800 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-300">Service {i + 1}</p>
                  <button
                    type="button"
                    onClick={() =>
                      patch((c) => {
                        c.services.splice(i, 1);
                        return c;
                      })
                    }
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Title" value={s.title} onChange={(v) => patch((c) => { c.services[i].title = v; return c; })} />
                  <label className="block text-sm text-slate-300">
                    Icon
                    <select
                      className={input}
                      value={s.icon}
                      onChange={(e) =>
                        patch((c) => {
                          c.services[i].icon = e.target.value as ServiceIcon;
                          return c;
                        })
                      }
                    >
                      {iconOptions.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <Field label="Description" value={s.description} onChange={(v) => patch((c) => { c.services[i].description = v; return c; })} multiline />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                patch((c) => {
                  c.services.push({
                    id: `service-${Date.now()}`,
                    title: "New service",
                    description: "Describe this service.",
                    icon: "cog",
                  });
                  return c;
                })
              }
              className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
            >
              <Plus className="h-4 w-4" /> Add service
            </button>
          </div>
        </Panel>

        <Panel title="How it works">
          <Field label="Section anchor ID" value={content.sections.howItWorks.anchorId} onChange={(v) => patch((c) => { c.sections.howItWorks.anchorId = v; return c; })} />
          <Field label="Section label" value={content.sections.howItWorks.label} onChange={(v) => patch((c) => { c.sections.howItWorks.label = v; return c; })} />
          <Field label="Section title" value={content.sections.howItWorks.title} onChange={(v) => patch((c) => { c.sections.howItWorks.title = v; return c; })} />
          <Field label="Section subtitle" value={content.sections.howItWorks.subtitle} onChange={(v) => patch((c) => { c.sections.howItWorks.subtitle = v; return c; })} />
          {content.howItWorks.map((step, i) => (
            <div key={i} className="rounded-lg border border-slate-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-300">Step {i + 1}</p>
                <button type="button" onClick={() => patch((c) => { c.howItWorks.splice(i, 1); return c; })} className="text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Step number" value={step.step} onChange={(v) => patch((c) => { c.howItWorks[i].step = v; return c; })} />
                <Field label="Title" value={step.title} onChange={(v) => patch((c) => { c.howItWorks[i].title = v; return c; })} />
              </div>
              <Field label="Text" value={step.text} onChange={(v) => patch((c) => { c.howItWorks[i].text = v; return c; })} multiline />
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              patch((c) => {
                c.howItWorks.push({ step: String(c.howItWorks.length + 1).padStart(2, "0"), title: "New step", text: "Describe this step." });
                return c;
              })
            }
            className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
          >
            <Plus className="h-4 w-4" /> Add step
          </button>
        </Panel>

        <Panel title="About section">
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
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-300">Why choose us cards</p>
            {content.whyUs.map((item, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input className={input} value={item.title} placeholder="Title" onChange={(e) => patch((c) => { c.whyUs[i].title = e.target.value; return c; })} />
                <input className={input} value={item.text} placeholder="Text" onChange={(e) => patch((c) => { c.whyUs[i].text = e.target.value; return c; })} />
                <button type="button" onClick={() => patch((c) => { c.whyUs.splice(i, 1); return c; })} className="self-end text-red-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patch((c) => { c.whyUs.push({ title: "New reason", text: "Why customers choose you." }); return c; })}
              className="inline-flex items-center gap-1 text-sm text-amber-400 hover:text-amber-300"
            >
              <Plus className="h-4 w-4" /> Add card
            </button>
          </div>
        </Panel>

        <Panel title="Reviews / testimonials">
          <Field label="Section anchor ID" value={content.sections.testimonials.anchorId} onChange={(v) => patch((c) => { c.sections.testimonials.anchorId = v; return c; })} />
          <Field label="Section label" value={content.sections.testimonials.label} onChange={(v) => patch((c) => { c.sections.testimonials.label = v; return c; })} />
          <Field label="Section title" value={content.sections.testimonials.title} onChange={(v) => patch((c) => { c.sections.testimonials.title = v; return c; })} />
          <Field label="Section subtitle" value={content.sections.testimonials.subtitle} onChange={(v) => patch((c) => { c.sections.testimonials.subtitle = v; return c; })} />
          {content.testimonials.map((t, i) => (
            <div key={i} className="rounded-lg border border-slate-800 p-4 space-y-2">
              <Field label="Quote" value={t.quote} onChange={(v) => patch((c) => { c.testimonials[i].quote = v; return c; })} multiline />
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Name" value={t.name} onChange={(v) => patch((c) => { c.testimonials[i].name = v; return c; })} />
                <Field label="Location" value={t.location} onChange={(v) => patch((c) => { c.testimonials[i].location = v; return c; })} />
              </div>
              <button
                type="button"
                onClick={() => patch((c) => { c.testimonials.splice(i, 1); return c; })}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Remove review
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              patch((c) => {
                c.testimonials.push({ quote: "Great service!", name: "Customer", location: "Local" });
                return c;
              })
            }
            className="inline-flex items-center gap-1 text-sm text-amber-400"
          >
            <Plus className="h-4 w-4" /> Add review
          </button>
        </Panel>

        <Panel title="Call to action">
          <Field label="Title" value={content.cta.title} onChange={(v) => patch((c) => { c.cta.title = v; return c; })} />
          <Field label="Description" value={content.cta.description} onChange={(v) => patch((c) => { c.cta.description = v; return c; })} multiline />
          <Field label="Button text" value={content.cta.buttonText} onChange={(v) => patch((c) => { c.cta.buttonText = v; return c; })} />
        </Panel>

        <Panel title="Contact page">
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
          <div className="space-y-2">
            <p className="text-sm text-slate-300">Quote form service options</p>
            {content.serviceOptions.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  className={input}
                  value={opt}
                  onChange={(e) =>
                    patch((c) => {
                      c.serviceOptions[i] = e.target.value;
                      return c;
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => patch((c) => { c.serviceOptions.splice(i, 1); return c; })}
                  className="shrink-0 text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patch((c) => { c.serviceOptions.push("New option"); return c; })}
              className="inline-flex items-center gap-1 text-sm text-amber-400"
            >
              <Plus className="h-4 w-4" /> Add option
            </button>
          </div>
        </Panel>

        <Panel title="Footer links">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Privacy link text" value={content.footer.privacyLabel} onChange={(v) => patch((c) => { c.footer.privacyLabel = v; return c; })} />
            <Field label="Terms link text" value={content.footer.termsLabel} onChange={(v) => patch((c) => { c.footer.termsLabel = v; return c; })} />
            <Field label="Contact link text" value={content.footer.contactLabel} onChange={(v) => patch((c) => { c.footer.contactLabel = v; return c; })} />
            <Field label="Staff login link text" value={content.footer.staffLoginLabel} onChange={(v) => patch((c) => { c.footer.staffLoginLabel = v; return c; })} />
          </div>
        </Panel>

        <Panel title="Images (URLs)">
          <p className="text-xs text-slate-500">Use direct image URLs (e.g. Unsplash). Images must be allowed in next.config.</p>
          <Field label="Hero image" value={content.images.hero} onChange={(v) => patch((c) => { c.images.hero = v; return c; })} />
          <Field label="About image" value={content.images.about} onChange={(v) => patch((c) => { c.images.about = v; return c; })} />
          <Field label="Services banner" value={content.images.services} onChange={(v) => patch((c) => { c.images.services = v; return c; })} />
          <Field label="Contact / CTA image" value={content.images.contact} onChange={(v) => patch((c) => { c.images.contact = v; return c; })} />
        </Panel>
      </div>

      <div className="sticky bottom-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save all changes"}
        </button>
      </div>
    </div>
  );
}
