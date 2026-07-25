"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, Car, ClipboardList, LogOut, RefreshCw } from "lucide-react";
import { SiteLogo } from "@/components/SiteLogo";
import { useAdminToast } from "@/components/admin/AdminToast";
import { StatusBadge, btnSecondary } from "@/components/admin/admin-ui";
import type { Booking, CustomerVehicle, WorkOrder } from "@/lib/shop-types";

type ClientMeResponse = {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string;
    customerId: string;
  };
  bookings: Booking[];
  workOrders: WorkOrder[];
  vehicles: CustomerVehicle[];
};

export function ClientPortal() {
  const toast = useAdminToast();
  const [data, setData] = useState<ClientMeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/client/me");
      const json = await res.json();
      if (!res.ok) {
        window.location.assign("/client/login");
        return;
      }
      setData(json);
    } catch {
      toast.error("Could not load your account.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function signOut() {
    await fetch("/api/client/login", { method: "DELETE" });
    window.location.assign("/client/login");
  }

  if (loading && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Loading your account…
      </main>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="transition hover:opacity-90">
            <SiteLogo size={40} showName subtitle="Client Portal" />
          </Link>
          <div className="flex items-center gap-2">
            <button type="button" onClick={load} className={btnSecondary} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button type="button" onClick={signOut} className={btnSecondary}>
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/80">Welcome</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{data.user.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {data.user.email}
            {data.user.phone ? ` · ${data.user.phone}` : ""}
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Need service?{" "}
            <Link href="/contact" className="text-amber-400 hover:text-amber-300">
              Request a quote
            </Link>
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <h2 className="font-semibold text-white">Your bookings</h2>
            </div>
            {!data.bookings.length ? (
              <p className="text-sm text-slate-500">No bookings yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.bookings.map((booking) => (
                  <li key={booking.id} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-100">{booking.service}</p>
                      <StatusBadge status={booking.status} />
                      {booking.depositPaid ? <StatusBadge status="deposit_paid" /> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {booking.date} at {booking.time}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-sky-400" />
              <h2 className="font-semibold text-white">Work orders</h2>
            </div>
            {!data.workOrders.length ? (
              <p className="text-sm text-slate-500">No work orders linked yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.workOrders.map((order) => (
                  <li key={order.id} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-100">{order.service}</p>
                      <StatusBadge status={order.status === "open" ? "pending" : order.status} />
                      <StatusBadge status={order.paymentStatus ?? "unpaid"} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{order.vehicle || "Vehicle on file"}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Car className="h-4 w-4 text-emerald-400" />
            <h2 className="font-semibold text-white">Vehicles on file</h2>
          </div>
          {!data.vehicles.length ? (
            <p className="text-sm text-slate-500">No vehicles saved yet. Our team can add them when you book.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {data.vehicles.map((vehicle) => (
                <li key={vehicle.id} className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3 text-sm">
                  <p className="font-medium text-slate-100">
                    {[vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {[vehicle.plate ? `Plate ${vehicle.plate}` : null, vehicle.vin ? `VIN ${vehicle.vin}` : null]
                      .filter(Boolean)
                      .join(" · ") || "Details on file"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
