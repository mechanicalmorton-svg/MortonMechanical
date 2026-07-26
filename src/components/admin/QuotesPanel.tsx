"use client";

import { useEffect, useState } from "react";
import { Archive, CalendarPlus, Inbox, Mail, Phone, Trash2 } from "lucide-react";
import type { Quote } from "@/lib/quotes";
import type { Booking } from "@/lib/shop-types";
import { adminGet, adminSend } from "./admin-fetch";
import { useAdminToast } from "./AdminToast";
import { EmptyState, PageHeader, StatusBadge, btnDanger, btnPrimary, btnSecondary } from "./admin-ui";
import { Can } from "./permissions";

export function QuotesPanel() {
  const toast = useAdminToast();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | Quote["status"]>("all");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [quotesRes, bookingsRes] = await Promise.all([
      adminGet<{ quotes: Quote[] }>("/api/admin/quotes"),
      adminGet<Booking[]>("/api/admin/bookings"),
    ]);
    if (quotesRes.error) {
      toast.error(quotesRes.error);
      setQuotes([]);
    } else {
      setQuotes(quotesRes.data?.quotes ?? []);
    }
    if (bookingsRes.error) {
      toast.error(bookingsRes.error);
      setBookings([]);
    } else {
      setBookings(bookingsRes.data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id: string, status: Quote["status"]) {
    const { error: message } = await adminSend("/api/admin/quotes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (message) toast.error(message);
    else load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this quote request permanently?")) return;
    const { error: message } = await adminSend("/api/admin/quotes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (message) toast.error(message);
    else load();
  }

  async function createBookingFromQuote(quote: Quote) {
    const existing = bookings.find((booking) => booking.quoteId === quote.id);
    if (existing) {
      toast.success("This request already has a booking — check the Bookings tab.");
      return;
    }
    setSchedulingId(quote.id);
    const { error: message } = await adminSend("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteId: quote.id,
        customerName: quote.name,
        phone: quote.phone,
        email: quote.email,
        service: quote.service,
        date: new Date().toISOString().slice(0, 10),
        time: "09:00",
        notes: [quote.rego ? `Rego: ${quote.rego}` : "", quote.message].filter(Boolean).join("\n"),
        status: "pending",
      }),
    });
    setSchedulingId(null);
    if (message) {
      toast.error(message);
      return;
    }
    if (quote.status === "new") {
      await adminSend("/api/admin/quotes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: quote.id, status: "read" }),
      });
    }
    toast.success("Booking created from website request.");
    load();
  }

  const filtered = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Quote Requests" subtitle="Enquiries submitted through your website contact form — linked to live bookings." />

      <div className="mb-6 flex flex-wrap gap-2">
        {(["all", "new", "read", "archived"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-xl px-3 py-1.5 text-xs font-medium capitalize transition ${
              filter === f ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20" : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !filtered.length ? (
        <EmptyState icon={Inbox} title="No quote requests" text="Website enquiries will appear here." />
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => {
            const linkedBooking = bookings.find((booking) => booking.quoteId === q.id);
            return (
              <article key={q.id} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-white">{q.name}</h2>
                      <StatusBadge status={q.status} />
                      {linkedBooking ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/20">
                          Booking {linkedBooking.status}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{q.service}</p>
                    <p className="mt-0.5 text-xs text-slate-600">{new Date(q.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Can permission="bookings.create">
                      {!linkedBooking ? (
                        <button
                          type="button"
                          onClick={() => createBookingFromQuote(q)}
                          disabled={schedulingId === q.id}
                          className={btnPrimary}
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                          {schedulingId === q.id ? "Creating…" : "Create booking"}
                        </button>
                      ) : null}
                    </Can>
                    <Can permission="quotes.edit">
                      {q.status !== "read" && (
                        <button type="button" onClick={() => updateStatus(q.id, "read")} className={btnSecondary}>
                          Mark read
                        </button>
                      )}
                      {q.status !== "archived" && (
                        <button type="button" onClick={() => updateStatus(q.id, "archived")} className={btnSecondary}>
                          <Archive className="h-3.5 w-3.5" /> Archive
                        </button>
                      )}
                    </Can>
                    <Can permission="quotes.delete">
                      <button type="button" onClick={() => remove(q.id)} className={btnDanger}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Can>
                  </div>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="h-4 w-4 text-amber-400" />
                    <a href={`tel:${q.phone}`} className="hover:text-amber-400">
                      {q.phone}
                    </a>
                  </div>
                  {q.email && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <Mail className="h-4 w-4 text-amber-400" />
                      <a href={`mailto:${q.email}`} className="hover:text-amber-400">
                        {q.email}
                      </a>
                    </div>
                  )}
                  {q.rego && (
                    <div>
                      <dt className="text-xs text-slate-500">Rego</dt>
                      <dd className="text-slate-300">{q.rego}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-xs text-slate-500">Preferred contact</dt>
                    <dd className="capitalize text-slate-300">{q.contactMethod}</dd>
                  </div>
                </dl>
                {q.message && (
                  <p className="mt-4 rounded-xl bg-slate-950/60 p-3 text-sm leading-relaxed text-slate-400">{q.message}</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
