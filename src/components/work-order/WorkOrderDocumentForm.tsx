"use client";

import {
  calculateDocumentTotals,
  DOCUMENT_TITLES,
  partLineTotal,
  SHOP_CONTACT,
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

function FieldLine({
  label,
  value,
  onChange,
  readOnly,
  type = "text",
  className = "",
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`wo-field ${className}`}>
      <span className="wo-field-label">{label}</span>
      <input
        className="wo-field-input"
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="wo-section-head">
      <span className="wo-section-icon" aria-hidden>
        {icon}
      </span>
      <span>{title}</span>
    </div>
  );
}

function DocumentHeader({
  kind,
  value,
  onChange,
  readOnly,
}: {
  kind: WorkOrderDocumentKind;
  value: WorkOrderDocumentFields;
  onChange?: (next: WorkOrderDocumentFields) => void;
  readOnly?: boolean;
}) {
  const title = DOCUMENT_TITLES[kind];
  return (
    <header className="wo-header">
      <div className="wo-header-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Morton's Mechanical LLC" className="wo-logo-img" width={92} height={92} />
      </div>
      <div className="wo-header-center">
        <h1 className="wo-title">{title}</h1>
        <div className="wo-title-stripe" aria-hidden />
        <div className="wo-contact">
          <p>
            <span className="wo-contact-icon">☎</span> {SHOP_CONTACT.phone}
          </p>
          <p>
            <span className="wo-contact-icon">✉</span> {SHOP_CONTACT.email}
          </p>
          <p>
            <span className="wo-contact-icon">⌖</span> {SHOP_CONTACT.address}
          </p>
        </div>
      </div>
      <div className="wo-header-meta">
        <FieldLine
          label={kind === "estimate" ? "ESTIMATE #:" : kind === "invoice" ? "INVOICE #:" : "WORK ORDER #:"}
          value={value.workOrderNumber}
          readOnly={readOnly}
          onChange={(workOrderNumber) => onChange?.({ ...value, workOrderNumber })}
        />
        <FieldLine
          label="DATE:"
          type="date"
          value={value.date}
          readOnly={readOnly}
          onChange={(date) => onChange?.({ ...value, date })}
        />
        <FieldLine
          label="PROMISED DATE:"
          type="date"
          value={value.promisedDate}
          readOnly={readOnly}
          onChange={(promisedDate) => onChange?.({ ...value, promisedDate })}
        />
        <FieldLine
          label="ADVISOR / SERVICE WRITER:"
          value={value.advisor}
          readOnly={readOnly}
          onChange={(advisor) => onChange?.({ ...value, advisor })}
        />
      </div>
    </header>
  );
}

function DocumentFooter({ page }: { page: 1 | 2 }) {
  return (
    <footer className="wo-footer">
      <p className="wo-thankyou">{SHOP_CONTACT.thankYou}</p>
      <div className="wo-footer-bolt" aria-hidden>
        ⬡
      </div>
      <p className="wo-slogan">
        {SHOP_CONTACT.slogan} <span>{SHOP_CONTACT.sloganAccent}</span>
      </p>
      {page === 2 ? <p className="wo-page-num">PAGE 2 OF 2</p> : null}
    </footer>
  );
}

export function WorkOrderDocumentForm({ kind, value, onChange, readOnly }: Props) {
  const totals = calculateDocumentTotals(value);
  const showAuthorization = kind !== "estimate";
  const totalLabel = kind === "estimate" ? "ESTIMATE TOTAL:" : "TOTAL DUE:";

  function patch(next: Partial<WorkOrderDocumentFields>) {
    onChange?.({ ...value, ...next });
  }

  return (
    <div className="wo-doc-root" data-kind={kind}>
      <style>{`
        .wo-doc-root {
          --wo-navy: #0a1931;
          --wo-cyan: #00a8ff;
          --wo-line: #c5d0de;
          --wo-muted: #6b7c93;
          color: var(--wo-navy);
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        }
        .wo-page {
          width: 8.5in;
          min-height: 11in;
          margin: 0 auto 24px;
          background: #fff;
          border: 1px solid #dbe3ef;
          box-shadow: 0 18px 40px rgba(2, 12, 27, 0.18);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .wo-page-body {
          flex: 1;
          padding: 14px 16px 10px;
        }
        .wo-header {
          display: grid;
          grid-template-columns: 110px 1fr 220px;
          gap: 10px;
          align-items: stretch;
          background: var(--wo-navy);
          color: #fff;
          padding: 12px 14px;
        }
        .wo-header-logo {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .wo-logo-img {
          width: 92px;
          height: 92px;
          object-fit: contain;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
        }
        .wo-header-center {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-width: 0;
        }
        .wo-title {
          margin: 0;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: 0.04em;
          line-height: 1;
        }
        .wo-title-stripe {
          height: 8px;
          margin: 8px 0 10px;
          background: repeating-linear-gradient(
            -45deg,
            var(--wo-cyan),
            var(--wo-cyan) 8px,
            #0077b8 8px,
            #0077b8 16px
          );
          border-radius: 2px;
        }
        .wo-contact {
          font-size: 12px;
          line-height: 1.45;
        }
        .wo-contact p {
          margin: 0;
        }
        .wo-contact-icon {
          color: var(--wo-cyan);
          margin-right: 6px;
        }
        .wo-header-meta {
          border-left: 2px solid var(--wo-cyan);
          padding-left: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          justify-content: center;
        }
        .wo-header-meta .wo-field-label {
          color: var(--wo-cyan);
        }
        .wo-header-meta .wo-field-input {
          color: #fff;
          border-bottom-color: rgba(255, 255, 255, 0.55);
        }
        .wo-field {
          display: block;
        }
        .wo-field-label {
          display: block;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--wo-muted);
          margin-bottom: 2px;
        }
        .wo-field-input,
        .wo-cell-input,
        .wo-notes-area,
        .wo-ruled-area {
          width: 100%;
          border: 0;
          border-bottom: 1px solid var(--wo-line);
          background: transparent;
          color: var(--wo-navy);
          font: inherit;
          font-size: 12px;
          padding: 2px 0;
          outline: none;
        }
        .wo-field-input:focus,
        .wo-cell-input:focus,
        .wo-notes-area:focus,
        .wo-ruled-area:focus {
          border-bottom-color: var(--wo-cyan);
        }
        .wo-field-input[readonly],
        .wo-cell-input[readonly],
        .wo-notes-area[readonly],
        .wo-ruled-area[readonly] {
          cursor: default;
        }
        .wo-section {
          border: 1.5px solid var(--wo-navy);
          border-radius: 8px;
          margin-top: 10px;
          overflow: hidden;
          background: #fff;
        }
        .wo-section-head {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--wo-navy);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.06em;
          padding: 7px 12px;
          border-bottom-right-radius: 8px;
        }
        .wo-section-icon {
          color: var(--wo-cyan);
          font-size: 12px;
        }
        .wo-section-body {
          padding: 10px 12px 12px;
        }
        .wo-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .wo-customer-grid {
          display: grid;
          gap: 8px;
        }
        .wo-vehicle-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 14px;
        }
        .wo-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 11px;
        }
        .wo-table th {
          text-align: left;
          font-size: 10px;
          letter-spacing: 0.05em;
          color: var(--wo-muted);
          border-bottom: 1.5px solid var(--wo-navy);
          padding: 4px 6px;
        }
        .wo-table td {
          border-bottom: 1px solid #e4ebf4;
          padding: 3px 4px;
          vertical-align: middle;
        }
        .wo-table .num {
          width: 28px;
          text-align: center;
          color: var(--wo-muted);
          font-weight: 700;
        }
        .wo-table .money {
          width: 90px;
        }
        .wo-table .qty {
          width: 48px;
        }
        .wo-table .partno {
          width: 110px;
        }
        .wo-money-wrap {
          display: flex;
          align-items: center;
          gap: 2px;
        }
        .wo-money-wrap::before {
          content: "$";
          color: var(--wo-muted);
          font-size: 11px;
        }
        .wo-parts-total {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          margin-top: 8px;
          font-size: 12px;
          font-weight: 800;
        }
        .wo-parts-total .wo-money-wrap {
          min-width: 90px;
          border-bottom: 1.5px solid var(--wo-navy);
          padding-bottom: 2px;
        }
        .wo-ruled-area {
          min-height: 132px;
          border: 0;
          resize: vertical;
          line-height: 1.65;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent,
            transparent 21px,
            #d9e2ee 21px,
            #d9e2ee 22px
          );
          background-attachment: local;
        }
        .wo-notes-area {
          min-height: 88px;
          border: 1px solid #d5deea;
          border-radius: 6px;
          padding: 8px;
          resize: vertical;
        }
        .wo-work-desc {
          min-height: 220px;
        }
        .wo-page2-grid {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 10px;
          margin-top: 10px;
          align-items: start;
        }
        .wo-legal {
          font-size: 10px;
          line-height: 1.45;
          color: #243447;
          margin: 0 0 10px;
        }
        .wo-sign-row {
          display: grid;
          grid-template-columns: 1.4fr 0.8fr;
          gap: 12px;
          margin-top: 8px;
        }
        .wo-check {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .wo-check input {
          width: 14px;
          height: 14px;
          accent-color: var(--wo-cyan);
        }
        .wo-payment-box {
          margin-top: 10px;
          border: 1.5px solid var(--wo-navy);
          border-radius: 8px;
          overflow: hidden;
        }
        .wo-payment-head {
          background: var(--wo-navy);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 7px 10px;
        }
        .wo-payment-body {
          padding: 10px;
        }
        .wo-summary-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6px;
        }
        .wo-summary-table td {
          padding: 7px 8px;
          border-bottom: 1px solid #d9e2ee;
          font-size: 12px;
          font-weight: 700;
        }
        .wo-summary-table td:last-child {
          text-align: right;
          width: 120px;
        }
        .wo-summary-total {
          background: var(--wo-navy);
          color: #fff;
        }
        .wo-summary-total td {
          border: 0;
          padding: 12px 10px;
          font-size: 15px;
        }
        .wo-summary-total .wo-money-wrap::before {
          color: #fff;
        }
        .wo-summary-total .wo-cell-input {
          color: #fff;
          border-bottom-color: rgba(255, 255, 255, 0.4);
          font-size: 16px;
          font-weight: 800;
          text-align: right;
        }
        .wo-tax-input {
          width: 42px;
          display: inline-block;
          text-align: center;
          border-bottom: 1px solid var(--wo-line);
          margin: 0 4px;
        }
        .wo-footer {
          margin-top: auto;
          background: var(--wo-navy);
          color: #fff;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          position: relative;
        }
        .wo-thankyou {
          margin: 0;
          font-family: "Segoe Script", "Brush Script MT", cursive;
          color: var(--wo-cyan);
          font-size: 18px;
        }
        .wo-footer-bolt {
          color: var(--wo-cyan);
          font-size: 18px;
        }
        .wo-slogan {
          margin: 0;
          text-align: right;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .wo-slogan span {
          color: var(--wo-cyan);
        }
        .wo-page-num {
          position: absolute;
          right: 16px;
          bottom: 4px;
          margin: 0;
          font-size: 9px;
          letter-spacing: 0.08em;
          opacity: 0.85;
        }
        .wo-estimate-note {
          margin-top: 10px;
          border: 1.5px dashed var(--wo-cyan);
          border-radius: 8px;
          padding: 12px;
          font-size: 11px;
          line-height: 1.45;
          color: #243447;
          background: #f3faff;
        }
        @media print {
          @page {
            size: letter;
            margin: 0.28in;
          }
          html,
          body {
            background: #fff !important;
            color-scheme: light !important;
          }
          body * {
            visibility: hidden !important;
          }
          .wo-print-root,
          .wo-print-root * {
            visibility: visible !important;
          }
          .wo-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .wo-page {
            width: auto;
            min-height: auto;
            margin: 0;
            border: 0;
            box-shadow: none;
            break-after: page;
            page-break-after: always;
          }
          .wo-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .wo-field-input,
          .wo-cell-input,
          .wo-notes-area,
          .wo-ruled-area {
            border-bottom-color: #999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
        @media (max-width: 920px) {
          .wo-page {
            width: 100%;
            min-height: 0;
          }
          .wo-header,
          .wo-two-col,
          .wo-page2-grid,
          .wo-vehicle-grid,
          .wo-sign-row,
          .wo-footer {
            grid-template-columns: 1fr;
          }
          .wo-header-meta {
            border-left: 0;
            border-top: 2px solid var(--wo-cyan);
            padding-left: 0;
            padding-top: 10px;
          }
          .wo-slogan,
          .wo-thankyou {
            text-align: center;
          }
        }
      `}</style>

      <section className="wo-page wo-page-1">
        <DocumentHeader kind={kind} value={value} onChange={onChange} readOnly={readOnly} />
        <div className="wo-page-body">
          <div className="wo-two-col">
            <section className="wo-section">
              <SectionHeader title="CUSTOMER INFORMATION" icon="👤" />
              <div className="wo-section-body wo-customer-grid">
                <FieldLine
                  label="NAME"
                  value={value.customer.name}
                  readOnly={readOnly}
                  onChange={(name) => patch({ customer: { ...value.customer, name } })}
                />
                <FieldLine
                  label="PHONE"
                  value={value.customer.phone}
                  readOnly={readOnly}
                  onChange={(phone) => patch({ customer: { ...value.customer, phone } })}
                />
                <FieldLine
                  label="EMAIL"
                  value={value.customer.email}
                  readOnly={readOnly}
                  onChange={(email) => patch({ customer: { ...value.customer, email } })}
                />
                <FieldLine
                  label="ADDRESS"
                  value={value.customer.address}
                  readOnly={readOnly}
                  onChange={(address) => patch({ customer: { ...value.customer, address } })}
                />
              </div>
            </section>

            <section className="wo-section">
              <SectionHeader title="VEHICLE INFORMATION" icon="🚗" />
              <div className="wo-section-body wo-vehicle-grid">
                <FieldLine
                  label="MAKE"
                  value={value.vehicle.make}
                  readOnly={readOnly}
                  onChange={(make) => patch({ vehicle: { ...value.vehicle, make } })}
                />
                <FieldLine
                  label="MODEL"
                  value={value.vehicle.model}
                  readOnly={readOnly}
                  onChange={(model) => patch({ vehicle: { ...value.vehicle, model } })}
                />
                <FieldLine
                  label="YEAR"
                  value={value.vehicle.year}
                  readOnly={readOnly}
                  onChange={(year) => patch({ vehicle: { ...value.vehicle, year } })}
                />
                <FieldLine
                  label="VIN"
                  value={value.vehicle.vin}
                  readOnly={readOnly}
                  onChange={(vin) => patch({ vehicle: { ...value.vehicle, vin } })}
                />
                <FieldLine
                  label="LICENSE PLATE"
                  value={value.vehicle.plate}
                  readOnly={readOnly}
                  onChange={(plate) => patch({ vehicle: { ...value.vehicle, plate } })}
                />
                <FieldLine
                  label="MILEAGE"
                  value={value.vehicle.mileage}
                  readOnly={readOnly}
                  onChange={(mileage) => patch({ vehicle: { ...value.vehicle, mileage } })}
                />
                <FieldLine
                  label="COLOR"
                  value={value.vehicle.color}
                  readOnly={readOnly}
                  onChange={(color) => patch({ vehicle: { ...value.vehicle, color } })}
                />
                <FieldLine
                  label="ENGINE"
                  value={value.vehicle.engine}
                  readOnly={readOnly}
                  onChange={(engine) => patch({ vehicle: { ...value.vehicle, engine } })}
                />
              </div>
            </section>
          </div>

          <section className="wo-section">
            <SectionHeader title="REQUESTED SERVICES / CUSTOMER CONCERNS" icon="🔧" />
            <div className="wo-section-body">
              <table className="wo-table">
                <thead>
                  <tr>
                    <th className="num">#</th>
                    <th>DESCRIPTION OF SERVICE</th>
                    <th className="money">EST. LABOR</th>
                  </tr>
                </thead>
                <tbody>
                  {value.services.map((line, index) => (
                    <tr key={`svc-${index}`}>
                      <td className="num">{index + 1}</td>
                      <td>
                        <input
                          className="wo-cell-input"
                          value={line.description}
                          readOnly={readOnly}
                          onChange={(e) => {
                            const services = value.services.map((row, i) =>
                              i === index ? { ...row, description: e.target.value } : row,
                            );
                            patch({ services });
                          }}
                        />
                      </td>
                      <td className="money">
                        <span className="wo-money-wrap">
                          <input
                            className="wo-cell-input"
                            inputMode="decimal"
                            value={line.estLabor ?? ""}
                            readOnly={readOnly}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const services = value.services.map((row, i) =>
                                i === index
                                  ? { ...row, estLabor: raw === "" ? null : Number(raw) }
                                  : row,
                              );
                              patch({ services });
                            }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="wo-section">
            <SectionHeader title="TECHNICIAN NOTES / DIAGNOSIS" icon="📋" />
            <div className="wo-section-body">
              <textarea
                className="wo-ruled-area"
                value={value.technicianNotes}
                readOnly={readOnly}
                onChange={(e) => patch({ technicianNotes: e.target.value })}
              />
            </div>
          </section>

          <section className="wo-section">
            <SectionHeader title="PARTS AND MATERIALS" icon="⚙" />
            <div className="wo-section-body">
              <table className="wo-table">
                <thead>
                  <tr>
                    <th className="qty">QTY</th>
                    <th>PART / DESCRIPTION</th>
                    <th className="partno">PART NUMBER</th>
                    <th className="money">UNIT PRICE</th>
                    <th className="money">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {value.parts.map((line, index) => (
                    <tr key={`part-${index}`}>
                      <td>
                        <input
                          className="wo-cell-input"
                          inputMode="decimal"
                          value={line.qty ?? ""}
                          readOnly={readOnly}
                          onChange={(e) => {
                            const raw = e.target.value.trim();
                            const parts = value.parts.map((row, i) =>
                              i === index ? { ...row, qty: raw === "" ? null : Number(raw) } : row,
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
                          onChange={(e) => {
                            const parts = value.parts.map((row, i) =>
                              i === index ? { ...row, description: e.target.value } : row,
                            );
                            patch({ parts });
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="wo-cell-input"
                          value={line.partNumber}
                          readOnly={readOnly}
                          onChange={(e) => {
                            const parts = value.parts.map((row, i) =>
                              i === index ? { ...row, partNumber: e.target.value } : row,
                            );
                            patch({ parts });
                          }}
                        />
                      </td>
                      <td>
                        <span className="wo-money-wrap">
                          <input
                            className="wo-cell-input"
                            inputMode="decimal"
                            value={line.unitPrice ?? ""}
                            readOnly={readOnly}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              const parts = value.parts.map((row, i) =>
                                i === index
                                  ? { ...row, unitPrice: raw === "" ? null : Number(raw) }
                                  : row,
                              );
                              patch({ parts });
                            }}
                          />
                        </span>
                      </td>
                      <td>
                        <span className="wo-money-wrap">
                          <input className="wo-cell-input" readOnly value={money(partLineTotal(line))} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="wo-parts-total">
                <span>PARTS TOTAL:</span>
                <span className="wo-money-wrap">{money(totals.partsTotal)}</span>
              </div>
            </div>
          </section>
        </div>
        <DocumentFooter page={1} />
      </section>

      <section className="wo-page wo-page-2">
        <DocumentHeader kind={kind} value={value} onChange={onChange} readOnly={readOnly} />
        <div className="wo-page-body">
          <section className="wo-section">
            <SectionHeader title="WORK DESCRIPTION" icon="📋" />
            <div className="wo-section-body">
              <textarea
                className="wo-ruled-area wo-work-desc"
                value={value.workDescription}
                readOnly={readOnly}
                onChange={(e) => patch({ workDescription: e.target.value })}
              />
            </div>
          </section>

          <div className="wo-page2-grid">
            <div>
              {showAuthorization ? (
                <>
                  <section className="wo-section">
                    <SectionHeader title="AUTHORIZATION" icon="🛡" />
                    <div className="wo-section-body">
                      <p className="wo-legal">
                        I hereby authorize the above repair work to be done along with the necessary
                        materials. You and your employees may operate the vehicle for purposes of
                        testing, inspection, or delivery at my risk. I acknowledge that Morton&apos;s
                        Mechanical LLC is not responsible for loss or damage to the vehicle or articles
                        left in the vehicle in case of fire, theft, or any cause beyond your control.
                      </p>
                      <div className="wo-sign-row">
                        <FieldLine
                          label="CUSTOMER SIGNATURE"
                          value={value.authorization.customerSignature}
                          readOnly={readOnly}
                          onChange={(customerSignature) =>
                            patch({
                              authorization: { ...value.authorization, customerSignature },
                            })
                          }
                        />
                        <FieldLine
                          label="DATE"
                          type="date"
                          value={value.authorization.date}
                          readOnly={readOnly}
                          onChange={(date) =>
                            patch({ authorization: { ...value.authorization, date } })
                          }
                        />
                      </div>
                      <label className="wo-check">
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
                        YES, I WOULD LIKE TO RECEIVE TEXT / EMAIL UPDATES.
                      </label>
                    </div>
                  </section>

                  <div className="wo-payment-box">
                    <div className="wo-payment-head">PAYMENT AUTHORIZATION (IF APPLICABLE)</div>
                    <div className="wo-payment-body">
                      <p className="wo-legal">
                        {kind === "invoice"
                          ? "I authorize Morton's Mechanical LLC to charge the payment method on file for the total amount due on this invoice."
                          : "I authorize Morton's Mechanical LLC to charge the payment method on file for approved work and parts as described on this work order."}
                      </p>
                      <div className="wo-sign-row">
                        <FieldLine
                          label="SIGNATURE"
                          value={value.authorization.paymentSignature}
                          readOnly={readOnly}
                          onChange={(paymentSignature) =>
                            patch({
                              authorization: { ...value.authorization, paymentSignature },
                            })
                          }
                        />
                        <FieldLine
                          label="DATE"
                          type="date"
                          value={value.authorization.paymentDate}
                          readOnly={readOnly}
                          onChange={(paymentDate) =>
                            patch({ authorization: { ...value.authorization, paymentDate } })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="wo-estimate-note">
                  This estimate is based on the information available at the time of writing. Final
                  charges may change after diagnosis or if additional parts/labor are required. No
                  work will be performed without your approval.
                </div>
              )}
            </div>

            <div>
              <section className="wo-section">
                <SectionHeader title="SUMMARY" icon="⚙" />
                <div className="wo-section-body" style={{ paddingTop: 4 }}>
                  <table className="wo-summary-table">
                    <tbody>
                      <tr>
                        <td>LABOR TOTAL</td>
                        <td>
                          <span className="wo-money-wrap">{money(totals.laborTotal)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>PARTS TOTAL</td>
                        <td>
                          <span className="wo-money-wrap">{money(totals.partsTotal)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>SUBTOTAL</td>
                        <td>
                          <span className="wo-money-wrap">{money(totals.subtotal)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          TAX (
                          <input
                            className="wo-tax-input"
                            inputMode="decimal"
                            value={value.summary.taxPercent}
                            readOnly={readOnly}
                            onChange={(e) =>
                              patch({
                                summary: {
                                  ...value.summary,
                                  taxPercent: Number(e.target.value) || 0,
                                },
                              })
                            }
                          />
                          %)
                        </td>
                        <td>
                          <span className="wo-money-wrap">{money(totals.taxAmount)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>EXCISE TAX / FEES</td>
                        <td>
                          <span className="wo-money-wrap">
                            <input
                              className="wo-cell-input"
                              inputMode="decimal"
                              value={value.summary.excise || ""}
                              readOnly={readOnly}
                              onChange={(e) =>
                                patch({
                                  summary: {
                                    ...value.summary,
                                    excise: e.target.value === "" ? 0 : Number(e.target.value) || 0,
                                  },
                                })
                              }
                            />
                          </span>
                        </td>
                      </tr>
                      <tr className="wo-summary-total">
                        <td>{totalLabel}</td>
                        <td>
                          <span className="wo-money-wrap">
                            <input className="wo-cell-input" readOnly value={money(totals.totalDue)} />
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="wo-section" style={{ marginTop: 10 }}>
                <SectionHeader title="NOTES" icon="✎" />
                <div className="wo-section-body">
                  <textarea
                    className="wo-notes-area"
                    value={value.notes}
                    readOnly={readOnly}
                    onChange={(e) => patch({ notes: e.target.value })}
                  />
                </div>
              </section>
            </div>
          </div>
        </div>
        <DocumentFooter page={2} />
      </section>
    </div>
  );
}
