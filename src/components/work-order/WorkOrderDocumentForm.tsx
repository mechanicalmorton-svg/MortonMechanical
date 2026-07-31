"use client";

import Image from "next/image";
import { useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import {
  calculateDocumentTotals,
  DOCUMENT_TITLES,
  SHOP_CONTACT,
  partLineTotal,
} from "@/lib/work-order-documents";
import type { WorkOrderDocumentFields, WorkOrderDocumentKind } from "@/lib/shop-types";

type Props = {
  kind: WorkOrderDocumentKind;
  value: WorkOrderDocumentFields;
  onChange?: (next: WorkOrderDocumentFields) => void;
  readOnly?: boolean;
};

function money(amount: number) {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function LineInput({
  value,
  onChange,
  readOnly,
  type = "text",
  align = "left",
  inputMode,
  className = "",
  ariaLabel,
}: {
  value: string | number;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: "text" | "date";
  align?: "left" | "right" | "center";
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  className?: string;
  ariaLabel: string;
}) {
  return (
    <input
      className={`wo-input ${className}`}
      style={{ textAlign: align }}
      type={type}
      inputMode={inputMode}
      value={value}
      readOnly={readOnly}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function NumberInput({
  value,
  onChange,
  readOnly,
  align = "right",
  className = "wo-cell-input",
  ariaLabel,
}: {
  value: number | null;
  onChange?: (next: number | null) => void;
  readOnly?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (value === null || value === undefined ? "" : String(value));

  return (
    <input
      className={className}
      style={{ textAlign: align }}
      inputMode="decimal"
      value={text}
      readOnly={readOnly}
      aria-label={ariaLabel}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        const parsed = raw.trim() === "" ? null : Number(raw);
        onChange?.(parsed !== null && Number.isFinite(parsed) ? parsed : null);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

function FieldRow({
  label,
  children,
  labelWidth,
}: {
  label: string;
  children: ReactNode;
  labelWidth?: string;
}) {
  return (
    <div className="wo-field">
      <span className="wo-field__label" style={labelWidth ? { flexBasis: labelWidth } : undefined}>
        {label}
      </span>
      <span className="wo-field__control">{children}</span>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`wo-panel ${className}`}>
      <header className="wo-panel__head">
        <span className="wo-panel__icon" aria-hidden>
          {icon}
        </span>
        <h3 className="wo-panel__title">{title}</h3>
      </header>
      <div className="wo-panel__body">{children}</div>
    </section>
  );
}

function RuledTextarea({
  value,
  onChange,
  readOnly,
  rows,
  ariaLabel,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  rows: number;
  ariaLabel: string;
}) {
  return (
    <textarea
      className="wo-lines"
      style={{ height: `${rows * 22}px` }}
      value={value}
      readOnly={readOnly}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function DocHeader({ kind, value, readOnly, patch }: {
  kind: WorkOrderDocumentKind;
  value: WorkOrderDocumentFields;
  readOnly?: boolean;
  patch: (next: Partial<WorkOrderDocumentFields>) => void;
}) {
  const numberLabel =
    kind === "estimate" ? "ESTIMATE #" : kind === "invoice" ? "INVOICE #" : "WORK ORDER #";

  return (
    <header className="wo-head">
      <div className="wo-head__brand">
        <Image
          className="wo-head__logo"
          src="/logo.png"
          alt="Morton's Mechanical LLC"
          width={96}
          height={96}
          priority
        />
      </div>

      <div className="wo-head__center">
        <p className="wo-head__title">{DOCUMENT_TITLES[kind]}</p>
        <span className="wo-head__rule" aria-hidden />
        <ul className="wo-head__contact">
          <li>{SHOP_CONTACT.phone}</li>
          <li>{SHOP_CONTACT.email}</li>
          <li>{SHOP_CONTACT.address}</li>
        </ul>
      </div>

      <div className="wo-head__meta">
        <FieldRow label={`${numberLabel}:`} labelWidth="7.6em">
          <LineInput
            className="wo-input--onNavy"
            value={value.workOrderNumber}
            readOnly={readOnly}
            ariaLabel={numberLabel}
            onChange={(workOrderNumber) => patch({ workOrderNumber })}
          />
        </FieldRow>
        <FieldRow label="DATE:" labelWidth="7.6em">
          <LineInput
            className="wo-input--onNavy"
            type="date"
            value={value.date}
            readOnly={readOnly}
            ariaLabel="Date"
            onChange={(date) => patch({ date })}
          />
        </FieldRow>
        <FieldRow label="PROMISED DATE:" labelWidth="7.6em">
          <LineInput
            className="wo-input--onNavy"
            type="date"
            value={value.promisedDate}
            readOnly={readOnly}
            ariaLabel="Promised date"
            onChange={(promisedDate) => patch({ promisedDate })}
          />
        </FieldRow>
        <FieldRow label="ADVISOR / SERVICE WRITER:" labelWidth="12.6em">
          <LineInput
            className="wo-input--onNavy"
            value={value.advisor}
            readOnly={readOnly}
            ariaLabel="Advisor or service writer"
            onChange={(advisor) => patch({ advisor })}
          />
        </FieldRow>
      </div>
    </header>
  );
}

function DocFooter() {
  return (
    <footer className="wo-foot">
      <span className="wo-foot__thanks">{SHOP_CONTACT.thankYou}</span>
      <span className="wo-foot__slogan">
        {SHOP_CONTACT.slogan} <em>{SHOP_CONTACT.sloganAccent}</em>
      </span>
    </footer>
  );
}

const IconUser = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20c.9-3.7 3.8-5.6 7.2-5.6s6.3 1.9 7.2 5.6" strokeLinecap="round" />
  </svg>
);
const IconCar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M3 13.5 5 8h14l2 5.5V18h-2.5M3 13.5V18h2.5M3 13.5h18" strokeLinecap="round" />
    <circle cx="7.5" cy="18" r="1.8" />
    <circle cx="16.5" cy="18" r="1.8" />
  </svg>
);
const IconWrench = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path
      d="M15.5 3.5a4.5 4.5 0 0 0-4 6.7L4 17.7 6.3 20l7.5-7.5a4.5 4.5 0 0 0 5.7-5.9l-2.5 2.5-2.1-2.1 2.5-2.5a4.6 4.6 0 0 0-1.9-1Z"
      strokeLinecap="round"
    />
  </svg>
);
const IconClipboard = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M9 4h6v2.5H9zM7 6.5h10V20H7z" strokeLinecap="round" />
    <path d="M9.5 11h5M9.5 14.5h5" strokeLinecap="round" />
  </svg>
);
const IconCog = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3v2.4M12 18.6V21M3 12h2.4M18.6 12H21M5.6 5.6l1.7 1.7M16.7 16.7l1.7 1.7M18.4 5.6l-1.7 1.7M7.3 16.7l-1.7 1.7" strokeLinecap="round" />
  </svg>
);
const IconShield = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M12 3.2 19 6v5.5c0 4.2-2.8 7.4-7 9.3-4.2-1.9-7-5.1-7-9.3V6z" strokeLinecap="round" />
    <path d="M9 12.2l2.2 2.2L15 10.6" strokeLinecap="round" />
  </svg>
);
const IconSum = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M6 5h12M6 5l6 7-6 7h12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconNote = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M5.5 4h13v16h-13z" strokeLinecap="round" />
    <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" strokeLinecap="round" />
  </svg>
);

export function WorkOrderDocumentForm({ kind, value, onChange, readOnly }: Props) {
  const totals = calculateDocumentTotals(value);
  const showAuthorization = kind !== "estimate";
  const totalLabel = kind === "estimate" ? "ESTIMATE TOTAL" : "TOTAL DUE";

  function patch(next: Partial<WorkOrderDocumentFields>) {
    onChange?.({ ...value, ...next });
  }

  return (
    <div className="wo-doc-root" data-kind={kind}>
      <style>{`
        .wo-doc-root {
          --navy: #0a1931;
          --navy-soft: #12294a;
          --cyan: #0f8fe0;
          --ink: #10203a;
          --rule: #b9c6da;
          color: var(--ink);
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
          font-size: 11px;
          line-height: 1.35;
        }
        .wo-sheet {
          width: 100%;
          max-width: 8.5in;
          margin: 0 auto 24px;
        }
        .wo-page {
          display: flex;
          flex-direction: column;
          gap: 9px;
          background: #fff;
          border: 1px solid #d5deeb;
          border-radius: 4px;
          padding: 14px 16px 0;
          box-shadow: 0 14px 34px rgba(2, 12, 27, 0.18);
          overflow: hidden;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        /* ---------- header ---------- */
        .wo-head {
          display: grid;
          grid-template-columns: 104px minmax(0, 1fr) minmax(0, 1.05fr);
          align-items: center;
          gap: 12px;
          background: var(--navy);
          border-radius: 4px;
          padding: 12px 14px;
        }
        .wo-head__brand { display: flex; align-items: center; justify-content: center; }
        .wo-head__logo {
          width: 92px;
          height: 92px;
          object-fit: contain;
        }
        .wo-head__center { min-width: 0; }
        .wo-head__title {
          margin: 0;
          color: #fff;
          font-size: 34px;
          line-height: 1;
          font-weight: 800;
          letter-spacing: 0.02em;
        }
        .wo-head__rule {
          display: block;
          height: 4px;
          width: 68%;
          margin: 6px 0 8px;
          background: linear-gradient(90deg, var(--cyan), rgba(15, 143, 224, 0.15));
          border-radius: 2px;
        }
        .wo-head__contact {
          margin: 0;
          padding: 0;
          list-style: none;
          color: #dbe8f7;
          font-size: 10px;
          line-height: 1.5;
        }
        .wo-head__meta { display: grid; gap: 7px; min-width: 0; }
        .wo-head__meta .wo-field__label { color: #7fc4f5; }

        /* ---------- generic field ---------- */
        .wo-field { display: flex; align-items: flex-end; gap: 6px; min-width: 0; }
        .wo-field__label {
          flex: 0 0 auto;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--navy);
          white-space: nowrap;
          padding-bottom: 2px;
        }
        .wo-field__control { flex: 1 1 auto; min-width: 0; display: block; }

        .wo-input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin: 0;
          padding: 0 3px 1px;
          border: 0;
          border-bottom: 1px solid var(--rule);
          border-radius: 0;
          background: transparent;
          color: var(--ink);
          font: inherit;
          font-size: 11px;
          line-height: 16px;
          height: 17px;
          min-width: 0;
          outline: none;
        }
        .wo-input--onNavy {
          border-bottom-color: rgba(214, 233, 250, 0.8);
          color: #f2f8ff;
          font-weight: 600;
        }
        .wo-input:focus {
          background: rgba(15, 143, 224, 0.1);
          border-bottom-color: var(--cyan);
        }
        .wo-input[readonly] { cursor: default; }
        input.wo-input[type="date"] {
          appearance: none;
          -webkit-appearance: none;
          color-scheme: light;
          font-size: 10.5px;
        }
        .wo-input--onNavy[type="date"] { color-scheme: dark; }

        /* ---------- panels ---------- */
        .wo-grid-2 {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 9px;
          align-items: start;
        }
        .wo-panel {
          border: 1.5px solid var(--navy);
          border-radius: 5px;
          overflow: hidden;
          background: #fff;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .wo-panel__head {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--navy);
          padding: 5px 9px;
        }
        .wo-panel__icon { display: inline-flex; width: 13px; height: 13px; color: #8ad0ff; }
        .wo-panel__icon svg { width: 100%; height: 100%; }
        .wo-panel__title {
          margin: 0;
          color: #fff;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
        }
        .wo-panel__body { padding: 9px 10px; display: grid; gap: 9px; }
        .wo-panel--flush .wo-panel__body { padding: 0; gap: 0; }

        .wo-vehicle-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 9px 10px;
        }

        /* ---------- tables ---------- */
        .wo-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .wo-table th {
          background: #eef3fa;
          border-bottom: 1px solid var(--navy);
          color: var(--navy);
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 4px 6px;
          text-align: left;
        }
        .wo-table td {
          border-bottom: 1px solid var(--rule);
          padding: 0 6px;
          height: 21px;
          vertical-align: middle;
        }
        .wo-table tr:last-child td { border-bottom: 0; }
        .wo-table .wo-col-num {
          width: 26px;
          text-align: center;
          color: var(--navy);
          font-size: 9.5px;
          font-weight: 700;
          background: #f6f9fd;
        }
        .wo-table .wo-cell-money { width: 84px; }
        .wo-table .wo-cell-qty { width: 42px; }
        .wo-table .wo-cell-pn { width: 132px; }
        .wo-table th.wo-th-right, .wo-table td.wo-td-right { text-align: right; }
        .wo-cell-input {
          display: block;
          width: 100%;
          box-sizing: border-box;
          border: 0;
          margin: 0;
          padding: 0;
          background: transparent;
          color: var(--ink);
          font: inherit;
          font-size: 10.5px;
          line-height: 19px;
          height: 19px;
          outline: none;
        }
        .wo-cell-input:focus { background: rgba(15, 143, 224, 0.12); }
        .wo-money-cell { display: flex; align-items: center; gap: 3px; }
        .wo-money-cell::before {
          content: "$";
          color: var(--navy);
          font-weight: 700;
          font-size: 10px;
        }
        .wo-money-cell .wo-cell-input { text-align: right; }
        .wo-total-row td {
          background: #eef3fa;
          border-top: 1.5px solid var(--navy);
          height: 24px;
          font-weight: 700;
          color: var(--navy);
        }
        .wo-total-row .wo-cell-input { font-weight: 700; }

        /* ---------- ruled text ---------- */
        .wo-lines {
          display: block;
          width: 100%;
          box-sizing: border-box;
          margin: 0;
          border: 0;
          outline: none;
          resize: none;
          overflow: hidden;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent 21px,
            var(--rule) 21px,
            var(--rule) 22px
          );
          background-attachment: local;
          color: var(--ink);
          font: inherit;
          font-size: 11px;
          line-height: 22px;
          padding: 0 3px;
        }
        .wo-lines:focus { background-color: rgba(15, 143, 224, 0.07); }

        /* ---------- summary ---------- */
        .wo-summary { width: 100%; border-collapse: collapse; }
        .wo-summary th {
          text-align: left;
          color: var(--navy);
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 5px 8px;
          border-bottom: 1px solid var(--rule);
          white-space: nowrap;
        }
        .wo-summary td {
          padding: 5px 8px;
          border-bottom: 1px solid var(--rule);
          width: 116px;
        }
        .wo-summary tr:last-child th, .wo-summary tr:last-child td { border-bottom: 0; }
        .wo-tax-label { display: inline-flex; align-items: baseline; gap: 2px; }
        .wo-tax-input {
          width: 34px;
          border: 0;
          border-bottom: 1px solid var(--rule);
          background: transparent;
          font: inherit;
          font-size: 10px;
          text-align: center;
          color: var(--ink);
          outline: none;
        }
        .wo-grand {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: var(--navy);
          color: #fff;
          padding: 8px 10px;
          border-radius: 4px;
        }
        .wo-panel--flush .wo-grand { margin: 8px; }
        .wo-grand__label {
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.05em;
        }
        .wo-grand__value {
          display: flex;
          align-items: center;
          gap: 5px;
          background: #fff;
          color: var(--navy);
          border-radius: 3px;
          padding: 4px 9px;
          min-width: 132px;
          justify-content: flex-end;
          font-size: 15px;
          font-weight: 800;
        }

        /* ---------- authorization ---------- */
        .wo-legal { margin: 0; font-size: 10px; line-height: 1.5; color: #26364f; }
        .wo-consent { display: flex; align-items: center; gap: 7px; }
        .wo-consent input {
          width: 13px;
          height: 13px;
          margin: 0;
          accent-color: var(--cyan);
        }
        .wo-consent span {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--navy);
        }
        .wo-estimate-note {
          border: 1.5px dashed var(--cyan);
          border-radius: 5px;
          padding: 10px 11px;
          font-size: 10px;
          line-height: 1.5;
          color: #26364f;
          background: #f7fbff;
        }

        /* ---------- footer ---------- */
        .wo-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: var(--navy);
          color: #fff;
          padding: 8px 12px;
          margin: 0 -16px;
        }
        .wo-foot__thanks { font-size: 13px; font-style: italic; font-weight: 600; }
        .wo-foot__slogan {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #dbe8f7;
        }
        .wo-foot__slogan em { color: var(--cyan); font-style: normal; }

        .wo-spacer { flex: 1 1 auto; min-height: 0; }

        @media print {
          @page { size: letter portrait; margin: 0.3in; }
          html, body { background: #fff !important; color-scheme: light !important; }
          body * { visibility: hidden !important; }
          .wo-print-root, .wo-print-root * { visibility: visible !important; }
          .wo-print-shell {
            position: static !important;
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: none !important;
            backdrop-filter: none !important;
          }
          .wo-print-root {
            position: static !important;
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .wo-sheet {
            width: 100%;
            max-width: none;
            margin: 0;
            break-after: page;
            page-break-after: always;
          }
          .wo-sheet:last-child { break-after: auto; page-break-after: auto; }
          .wo-page {
            border: 0;
            border-radius: 0;
            box-shadow: none;
            padding: 0;
            gap: 7px;
          }
          .wo-foot { margin: 0; }
          .wo-input:focus, .wo-cell-input:focus, .wo-lines:focus {
            background: transparent !important;
          }
          input[type="date"]::-webkit-calendar-picker-indicator { display: none; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ------------------------------- page 1 ------------------------------- */}
      <div className="wo-sheet">
        <section className="wo-page" aria-label={`${DOCUMENT_TITLES[kind]} page 1`}>
          <DocHeader kind={kind} value={value} readOnly={readOnly} patch={patch} />

          <div className="wo-grid-2">
            <Panel title="Customer Information" icon={IconUser}>
              <FieldRow label="Name:" labelWidth="4.6em">
                <LineInput
                  value={value.customer.name}
                  readOnly={readOnly}
                  ariaLabel="Customer name"
                  onChange={(name) => patch({ customer: { ...value.customer, name } })}
                />
              </FieldRow>
              <FieldRow label="Phone:" labelWidth="4.6em">
                <LineInput
                  value={value.customer.phone}
                  readOnly={readOnly}
                  ariaLabel="Customer phone"
                  onChange={(phone) => patch({ customer: { ...value.customer, phone } })}
                />
              </FieldRow>
              <FieldRow label="Email:" labelWidth="4.6em">
                <LineInput
                  value={value.customer.email}
                  readOnly={readOnly}
                  ariaLabel="Customer email"
                  onChange={(email) => patch({ customer: { ...value.customer, email } })}
                />
              </FieldRow>
              <FieldRow label="Address:" labelWidth="4.6em">
                <LineInput
                  value={value.customer.address}
                  readOnly={readOnly}
                  ariaLabel="Customer address"
                  onChange={(address) => patch({ customer: { ...value.customer, address } })}
                />
              </FieldRow>
            </Panel>

            <Panel title="Vehicle Information" icon={IconCar}>
              <div className="wo-vehicle-grid">
                <FieldRow label="Make:" labelWidth="3.4em">
                  <LineInput
                    value={value.vehicle.make}
                    readOnly={readOnly}
                    ariaLabel="Vehicle make"
                    onChange={(make) => patch({ vehicle: { ...value.vehicle, make } })}
                  />
                </FieldRow>
                <FieldRow label="Model:" labelWidth="3.6em">
                  <LineInput
                    value={value.vehicle.model}
                    readOnly={readOnly}
                    ariaLabel="Vehicle model"
                    onChange={(model) => patch({ vehicle: { ...value.vehicle, model } })}
                  />
                </FieldRow>
                <FieldRow label="Year:" labelWidth="3.4em">
                  <LineInput
                    value={value.vehicle.year}
                    readOnly={readOnly}
                    ariaLabel="Vehicle year"
                    onChange={(year) => patch({ vehicle: { ...value.vehicle, year } })}
                  />
                </FieldRow>
                <FieldRow label="VIN:" labelWidth="3.6em">
                  <LineInput
                    value={value.vehicle.vin}
                    readOnly={readOnly}
                    ariaLabel="Vehicle VIN"
                    onChange={(vin) => patch({ vehicle: { ...value.vehicle, vin } })}
                  />
                </FieldRow>
                <FieldRow label="Plate:" labelWidth="3.4em">
                  <LineInput
                    value={value.vehicle.plate}
                    readOnly={readOnly}
                    ariaLabel="License plate"
                    onChange={(plate) => patch({ vehicle: { ...value.vehicle, plate } })}
                  />
                </FieldRow>
                <FieldRow label="Mileage:" labelWidth="3.6em">
                  <LineInput
                    value={value.vehicle.mileage}
                    readOnly={readOnly}
                    ariaLabel="Vehicle mileage"
                    onChange={(mileage) => patch({ vehicle: { ...value.vehicle, mileage } })}
                  />
                </FieldRow>
                <FieldRow label="Color:" labelWidth="3.4em">
                  <LineInput
                    value={value.vehicle.color}
                    readOnly={readOnly}
                    ariaLabel="Vehicle color"
                    onChange={(color) => patch({ vehicle: { ...value.vehicle, color } })}
                  />
                </FieldRow>
                <FieldRow label="Engine:" labelWidth="3.6em">
                  <LineInput
                    value={value.vehicle.engine}
                    readOnly={readOnly}
                    ariaLabel="Vehicle engine"
                    onChange={(engine) => patch({ vehicle: { ...value.vehicle, engine } })}
                  />
                </FieldRow>
              </div>
            </Panel>
          </div>

          <Panel
            title="Requested Services / Customer Concerns"
            icon={IconWrench}
            className="wo-panel--flush"
          >
            <table className="wo-table">
              <thead>
                <tr>
                  <th className="wo-col-num">#</th>
                  <th>Description of Service</th>
                  <th className="wo-cell-money wo-th-right">Est. Labor</th>
                </tr>
              </thead>
              <tbody>
                {value.services.map((line, index) => (
                  <tr key={`svc-${index}`}>
                    <td className="wo-col-num">{index + 1}</td>
                    <td>
                      <input
                        className="wo-cell-input"
                        value={line.description}
                        readOnly={readOnly}
                        aria-label={`Service ${index + 1} description`}
                        onChange={(e) => {
                          const services = value.services.map((row, i) =>
                            i === index ? { ...row, description: e.target.value } : row,
                          );
                          patch({ services });
                        }}
                      />
                    </td>
                    <td className="wo-cell-money">
                      <span className="wo-money-cell">
                        <NumberInput
                          value={line.estLabor}
                          readOnly={readOnly}
                          ariaLabel={`Service ${index + 1} estimated labor`}
                          onChange={(estLabor) => {
                            const services = value.services.map((row, i) =>
                              i === index ? { ...row, estLabor } : row,
                            );
                            patch({ services });
                          }}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="wo-total-row">
                  <td className="wo-col-num" />
                  <td className="wo-td-right">Labor Total</td>
                  <td className="wo-cell-money">
                    <span className="wo-money-cell">
                      <input
                        className="wo-cell-input"
                        value={money(totals.laborTotal)}
                        readOnly
                        aria-label="Labor total"
                      />
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>

          <Panel title="Technician Notes / Diagnosis" icon={IconClipboard}>
            <RuledTextarea
              rows={6}
              value={value.technicianNotes}
              readOnly={readOnly}
              ariaLabel="Technician notes and diagnosis"
              onChange={(technicianNotes) => patch({ technicianNotes })}
            />
          </Panel>

          <Panel title="Parts and Materials" icon={IconCog} className="wo-panel--flush">
            <table className="wo-table">
              <thead>
                <tr>
                  <th className="wo-cell-qty">Qty</th>
                  <th>Part / Description</th>
                  <th className="wo-cell-pn">Part Number</th>
                  <th className="wo-cell-money wo-th-right">Unit Price</th>
                  <th className="wo-cell-money wo-th-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {value.parts.map((line, index) => (
                  <tr key={`part-${index}`}>
                    <td className="wo-cell-qty">
                      <NumberInput
                        value={line.qty}
                        align="center"
                        readOnly={readOnly}
                        ariaLabel={`Part ${index + 1} quantity`}
                        onChange={(qty) => {
                          const parts = value.parts.map((row, i) =>
                            i === index ? { ...row, qty } : row,
                          );
                          patch({ parts });
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="wo-cell-input"
                        value={line.description}
                        readOnly={readOnly}
                        aria-label={`Part ${index + 1} description`}
                        onChange={(e) => {
                          const parts = value.parts.map((row, i) =>
                            i === index ? { ...row, description: e.target.value } : row,
                          );
                          patch({ parts });
                        }}
                      />
                    </td>
                    <td className="wo-cell-pn">
                      <input
                        className="wo-cell-input"
                        value={line.partNumber}
                        readOnly={readOnly}
                        aria-label={`Part ${index + 1} number`}
                        onChange={(e) => {
                          const parts = value.parts.map((row, i) =>
                            i === index ? { ...row, partNumber: e.target.value } : row,
                          );
                          patch({ parts });
                        }}
                      />
                    </td>
                    <td className="wo-cell-money">
                      <span className="wo-money-cell">
                        <NumberInput
                          value={line.unitPrice}
                          readOnly={readOnly}
                          ariaLabel={`Part ${index + 1} unit price`}
                          onChange={(unitPrice) => {
                            const parts = value.parts.map((row, i) =>
                              i === index ? { ...row, unitPrice } : row,
                            );
                            patch({ parts });
                          }}
                        />
                      </span>
                    </td>
                    <td className="wo-cell-money">
                      <span className="wo-money-cell">
                        <input
                          className="wo-cell-input"
                          value={line.qty || line.unitPrice ? money(partLineTotal(line)) : ""}
                          readOnly
                          aria-label={`Part ${index + 1} line total`}
                        />
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="wo-total-row">
                  <td className="wo-cell-qty" />
                  <td />
                  <td className="wo-cell-pn wo-td-right">Parts Total</td>
                  <td className="wo-cell-money" />
                  <td className="wo-cell-money">
                    <span className="wo-money-cell">
                      <input
                        className="wo-cell-input"
                        value={money(totals.partsTotal)}
                        readOnly
                        aria-label="Parts total"
                      />
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>

          <div className="wo-spacer" />
          <DocFooter />
        </section>
      </div>

      {/* ------------------------------- page 2 ------------------------------- */}
      <div className="wo-sheet">
        <section className="wo-page" aria-label={`${DOCUMENT_TITLES[kind]} page 2`}>
          <DocHeader kind={kind} value={value} readOnly={readOnly} patch={patch} />

          <Panel title="Work Description" icon={IconClipboard}>
            <RuledTextarea
              rows={10}
              value={value.workDescription}
              readOnly={readOnly}
              ariaLabel="Work description"
              onChange={(workDescription) => patch({ workDescription })}
            />
          </Panel>

          <div className="wo-grid-2">
            <div style={{ display: "grid", gap: "9px" }}>
              {showAuthorization ? (
                <>
                  <Panel title="Authorization" icon={IconShield}>
                    <p className="wo-legal">
                      I authorize the repair work to be done along with the necessary materials. You
                      and your employees may operate the vehicle for the purpose of testing,
                      inspection, or delivery.
                    </p>
                    <FieldRow label="Customer Signature:" labelWidth="9.4em">
                      <LineInput
                        value={value.authorization.customerSignature}
                        readOnly={readOnly}
                        ariaLabel="Customer signature"
                        onChange={(customerSignature) =>
                          patch({ authorization: { ...value.authorization, customerSignature } })
                        }
                      />
                    </FieldRow>
                    <FieldRow label="Date:" labelWidth="9.4em">
                      <LineInput
                        type="date"
                        value={value.authorization.date}
                        readOnly={readOnly}
                        ariaLabel="Authorization date"
                        onChange={(date) =>
                          patch({ authorization: { ...value.authorization, date } })
                        }
                      />
                    </FieldRow>
                    <label className="wo-consent">
                      <input
                        type="checkbox"
                        checked={value.authorization.textEmailUpdates}
                        disabled={readOnly}
                        onChange={(e) =>
                          patch({
                            authorization: {
                              ...value.authorization,
                              textEmailUpdates: e.target.checked,
                            },
                          })
                        }
                      />
                      <span>Yes, I would like to receive text / email updates</span>
                    </label>
                  </Panel>

                  <Panel title="Payment Authorization (If Applicable)" icon={IconShield}>
                    <p className="wo-legal">
                      I authorize {SHOP_CONTACT.businessName} to charge the payment method on file
                      for the final invoice amount.
                    </p>
                    <FieldRow label="Signature:" labelWidth="5.6em">
                      <LineInput
                        value={value.authorization.paymentSignature}
                        readOnly={readOnly}
                        ariaLabel="Payment signature"
                        onChange={(paymentSignature) =>
                          patch({ authorization: { ...value.authorization, paymentSignature } })
                        }
                      />
                    </FieldRow>
                    <FieldRow label="Date:" labelWidth="5.6em">
                      <LineInput
                        type="date"
                        value={value.authorization.paymentDate}
                        readOnly={readOnly}
                        ariaLabel="Payment authorization date"
                        onChange={(paymentDate) =>
                          patch({ authorization: { ...value.authorization, paymentDate } })
                        }
                      />
                    </FieldRow>
                  </Panel>
                </>
              ) : (
                <div className="wo-estimate-note">
                  This estimate is based on the information available at the time of writing. Final
                  charges may change after diagnosis or if additional parts / labor are required. No
                  work will be performed without your approval.
                </div>
              )}
            </div>

            <div style={{ display: "grid", gap: "9px" }}>
              <Panel title="Summary" icon={IconSum} className="wo-panel--flush">
                <table className="wo-summary">
                  <tbody>
                    <tr>
                      <th>Labor Total:</th>
                      <td>
                        <span className="wo-money-cell">
                          <input
                            className="wo-cell-input"
                            value={money(totals.laborTotal)}
                            readOnly
                            aria-label="Summary labor total"
                          />
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>Parts Total:</th>
                      <td>
                        <span className="wo-money-cell">
                          <input
                            className="wo-cell-input"
                            value={money(totals.partsTotal)}
                            readOnly
                            aria-label="Summary parts total"
                          />
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>Subtotal:</th>
                      <td>
                        <span className="wo-money-cell">
                          <input
                            className="wo-cell-input"
                            value={money(totals.subtotal)}
                            readOnly
                            aria-label="Summary subtotal"
                          />
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>
                        <span className="wo-tax-label">
                          Tax (
                          <NumberInput
                            className="wo-tax-input"
                            align="center"
                            value={value.summary.taxPercent}
                            readOnly={readOnly}
                            ariaLabel="Tax percent"
                            onChange={(taxPercent) =>
                              patch({
                                summary: { ...value.summary, taxPercent: taxPercent ?? 0 },
                              })
                            }
                          />
                          %):
                        </span>
                      </th>
                      <td>
                        <span className="wo-money-cell">
                          <input
                            className="wo-cell-input"
                            value={money(totals.taxAmount)}
                            readOnly
                            aria-label="Tax amount"
                          />
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th>Excise Tax / Fees:</th>
                      <td>
                        <span className="wo-money-cell">
                          <NumberInput
                            value={value.summary.excise || null}
                            readOnly={readOnly}
                            ariaLabel="Excise tax or fees"
                            onChange={(excise) =>
                              patch({ summary: { ...value.summary, excise: excise ?? 0 } })
                            }
                          />
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="wo-grand">
                  <span className="wo-grand__label">{totalLabel}:</span>
                  <span className="wo-grand__value">
                    <span aria-hidden>$</span>
                    {money(totals.totalDue)}
                  </span>
                </div>
              </Panel>

              <Panel title="Notes" icon={IconNote}>
                <RuledTextarea
                  rows={5}
                  value={value.notes}
                  readOnly={readOnly}
                  ariaLabel="Document notes"
                  onChange={(notes) => patch({ notes })}
                />
              </Panel>
            </div>
          </div>

          <div className="wo-spacer" />
          <DocFooter />
        </section>
      </div>
    </div>
  );
}
