"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import {
  calculateDocumentTotals,
  DOCUMENT_TITLES,
  partLineTotal,
} from "@/lib/work-order-documents";
import type { WorkOrderDocumentFields, WorkOrderDocumentKind } from "@/lib/shop-types";

type Props = {
  kind: WorkOrderDocumentKind;
  value: WorkOrderDocumentFields;
  onChange?: (next: WorkOrderDocumentFields) => void;
  readOnly?: boolean;
};

type Box = {
  left: string;
  width: string;
  /** Box top (used for centered table cells). */
  top?: string;
  height?: string;
  /** Printed underline Y% — text sits just above this line (baseline fields). */
  line?: string;
};

function money(amount: number) {
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AbsInput({
  box,
  value,
  onChange,
  readOnly,
  type = "text",
  align = "left",
  vAlign = "baseline",
  className = "",
  inputMode,
  "aria-label": ariaLabel,
}: {
  box: Box;
  value: string | number;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: string;
  align?: "left" | "right" | "center";
  /** baseline = sit on underline; center = middle of table row */
  vAlign?: "baseline" | "center";
  className?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  "aria-label"?: string;
}) {
  const baseline = vAlign === "baseline" && Boolean(box.line);
  const style: CSSProperties = baseline
    ? {
        left: box.left,
        /* Sit the control on the printed underline (line Y), growing upward */
        top: `calc(${box.line} - 13px)`,
        width: box.width,
        height: "13px",
      }
    : {
        left: box.left,
        top: box.top ?? "0%",
        width: box.width,
        height: box.height ?? "2.1%",
      };

  return (
    <div
      className={`wo-abs-field ${baseline ? "wo-abs-field--baseline" : "wo-abs-field--center"}`}
      style={style}
    >
      <input
        className={`wo-abs-input ${type === "date" ? "wo-abs-date" : ""} ${className}`}
        style={{ textAlign: align }}
        type={type}
        inputMode={inputMode}
        value={value}
        readOnly={readOnly}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  );
}

function AbsArea({
  box,
  value,
  onChange,
  readOnly,
  className = "",
}: {
  box: Box;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  className?: string;
}) {
  return (
    <textarea
      className={`wo-abs-area ${className}`}
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height ?? "10%",
      }}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
}

function TitleCover({ kind }: { kind: WorkOrderDocumentKind }) {
  if (kind === "work-order") return null;
  return <div className="wo-title-cover">{DOCUMENT_TITLES[kind]}</div>;
}

function MetaLabelCover({ kind }: { kind: WorkOrderDocumentKind }) {
  if (kind === "work-order") return null;
  return (
    <div className="wo-meta-label-cover">
      {kind === "estimate" ? "ESTIMATE #:" : "INVOICE #:"}
    </div>
  );
}

/**
 * Coordinates are % of the 1024×1536 template.
 * Baseline fields use `line` = underline / row-rule Y%; text sits just above it.
 * Vehicle left/width vary by label length (LICENSE PLATE is much longer than MAKE).
 */
const P1 = {
  meta: [
    { left: "80.5%", line: "4.20%", width: "15%" },
    { left: "74%", line: "7.13%", width: "21.5%" },
    { left: "80.5%", line: "10.00%", width: "15%" },
    { left: "86%", line: "12.96%", width: "10%" },
  ],
  // Customer / vehicle underlines at y=341,377,414,451
  infoLines: ["22.20%", "24.54%", "26.95%", "29.36%"],
  customer: { left: "12.5%", width: "33%" },
  vehicle: {
    make: { left: "55.8%", width: "14.8%" },
    model: { left: "78.5%", width: "17%" },
    year: { left: "55.8%", width: "14.8%" },
    vin: { left: "76.5%", width: "19%" },
    // LICENSE PLATE# label is long — value starts on the underline after it
    plate: { left: "61.5%", width: "9.2%" },
    mileage: { left: "79.5%", width: "16%" },
    color: { left: "55.8%", width: "14.8%" },
    engine: { left: "78.5%", width: "17%" },
  },
  // Service row bottom rules at y=584,617,650,683,717,750
  serviceLineStart: 38.02,
  servicePitch: 2.15,
  // Notes: first rule y=856, pitch 22px → 1.432%
  notes: { left: "5%", top: "54.80%", width: "90%", height: "8.7%" },
  // Part row bottom rules at y=1099,1129,... pitch 29px
  partLineStart: 71.55,
  partPitch: 1.89,
  partsTotalLine: "90.56%",
} as const;

const P2 = {
  meta: [
    { left: "80%", line: "4.69%", width: "16.5%" },
    { left: "74.5%", line: "8.04%", width: "22%" },
    { left: "80%", line: "11.42%", width: "16.5%" },
    { left: "86%", line: "14.88%", width: "10.5%" },
  ],
} as const;

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
          --wo-navy: #0a1931;
          --wo-cyan: #00a8ff;
          color: #0a1931;
          font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        }
        .wo-sheet {
          width: min(100%, 8.5in);
          margin: 0 auto 28px;
        }
        .wo-page {
          position: relative;
          width: 100%;
          aspect-ratio: 1024 / 1536;
          background-color: #fff;
          background-repeat: no-repeat;
          background-position: center;
          background-size: 100% 100%;
          box-shadow: 0 18px 40px rgba(2, 12, 27, 0.22);
          overflow: hidden;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .wo-page-1 { background-image: url("/documents/workorder-page-1.png"); }
        .wo-page-2 { background-image: url("/documents/workorder-page-2.png"); }
        .wo-abs-field {
          position: absolute;
          display: flex;
          box-sizing: border-box;
          z-index: 1;
          pointer-events: none;
        }
        .wo-abs-field--baseline {
          align-items: flex-end;
          overflow: visible;
        }
        .wo-abs-field--baseline .wo-abs-input {
          height: 12px;
          line-height: 12px;
          font-size: 11px;
          /* Seat ink on the printed rule */
          transform: translateY(2px);
        }
        .wo-abs-field--center {
          align-items: center;
        }
        .wo-abs-input {
          pointer-events: auto;
          display: block;
          width: 100%;
          margin: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #0b1b33;
          font: inherit;
          font-size: 11px;
          line-height: 12px;
          padding: 0 2px;
          box-sizing: border-box;
        }
        .wo-abs-field--center .wo-abs-input {
          height: 1.15em;
          font-size: clamp(9px, 1.05vw, 11.5px);
          line-height: 1.15;
          transform: none;
        }
        .wo-abs-area {
          position: absolute;
          margin: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #0b1b33;
          font: inherit;
          font-size: 11px;
          /* Match note-rule pitch: 22px @ 1536 → 17.5px @ 1224 */
          line-height: 17.5px;
          padding: 0 4px;
          box-sizing: border-box;
          resize: none;
          overflow: hidden;
          z-index: 1;
        }
        .wo-abs-input:focus,
        .wo-abs-area:focus {
          background: rgba(0, 168, 255, 0.1);
          box-shadow: inset 0 -1.5px 0 var(--wo-cyan);
        }
        .wo-abs-input[readonly],
        .wo-abs-area[readonly] {
          cursor: default;
        }
        .wo-abs-date {
          appearance: none;
          -webkit-appearance: none;
          min-width: 0;
          max-width: 100%;
          height: 12px;
          color-scheme: light;
          font-size: 10px;
          line-height: 12px;
        }
        .wo-abs-date::-webkit-calendar-picker-indicator {
          opacity: 0.35;
          width: 11px;
          height: 11px;
          padding: 0;
          margin: 0 0 0 2px;
          cursor: pointer;
        }
        .wo-abs-date::-webkit-datetime-edit,
        .wo-abs-date::-webkit-datetime-edit-fields-wrapper,
        .wo-abs-date::-webkit-datetime-edit-text,
        .wo-abs-date::-webkit-datetime-edit-month-field,
        .wo-abs-date::-webkit-datetime-edit-day-field,
        .wo-abs-date::-webkit-datetime-edit-year-field {
          padding: 0;
          margin: 0;
        }
        .wo-title-cover {
          position: absolute;
          left: 27%;
          top: 1.55%;
          width: 38%;
          height: 4.9%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--wo-navy);
          color: #fff;
          font-size: clamp(15px, 2.2vw, 26px);
          font-weight: 800;
          letter-spacing: 0.06em;
          z-index: 3;
        }
        .wo-meta-label-cover {
          position: absolute;
          left: 66%;
          top: 1.9%;
          width: 13.2%;
          height: 2.7%;
          background: var(--wo-navy);
          color: var(--wo-cyan);
          font-size: clamp(8px, 0.95vw, 10px);
          font-weight: 700;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          padding-left: 2px;
          z-index: 3;
        }
        .wo-page-2 .wo-title-cover {
          left: 26.9%;
          top: 2%;
          width: 37%;
          height: 4.8%;
        }
        .wo-page-2 .wo-meta-label-cover {
          left: 65.2%;
          top: 2.35%;
          width: 14.8%;
          height: 2.6%;
        }
        .wo-check {
          position: absolute;
          width: 1.5%;
          height: 1%;
          accent-color: var(--wo-cyan);
          z-index: 1;
        }
        .wo-estimate-banner {
          position: absolute;
          left: 5.5%;
          top: 62%;
          width: 52%;
          height: 22%;
          background: rgba(255, 255, 255, 0.96);
          border: 2px dashed var(--wo-cyan);
          border-radius: 10px;
          padding: 3%;
          font-size: clamp(10px, 1.2vw, 12px);
          line-height: 1.45;
          color: #243447;
          z-index: 3;
        }
        .wo-total-input {
          font-weight: 700;
          font-size: clamp(11px, 1.3vw, 14px);
        }
        @media print {
          @page { size: 8.5in 12.75in; margin: 0; }
          html, body { background: #fff !important; color-scheme: light !important; }
          body * { visibility: hidden !important; }
          .wo-print-root, .wo-print-root * { visibility: visible !important; }
          .wo-print-root {
            position: absolute;
            inset: 0;
            width: 100%;
            margin: 0 !important;
            max-width: none !important;
          }
          .wo-sheet { width: 8.5in; margin: 0; }
          .wo-page {
            width: 8.5in;
            height: 12.75in;
            aspect-ratio: auto;
            margin: 0;
            box-shadow: none;
            break-after: page;
            page-break-after: always;
          }
          .wo-page:last-child { break-after: auto; page-break-after: auto; }
          .wo-abs-input:focus, .wo-abs-area:focus {
            background: transparent !important;
            box-shadow: none !important;
          }
          .wo-abs-date::-webkit-calendar-picker-indicator { display: none; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="wo-sheet">
        <section className="wo-page wo-page-1" aria-label="Work order page 1">
          <TitleCover kind={kind} />
          <MetaLabelCover kind={kind} />

          <AbsInput
            box={P1.meta[0]}
            value={value.workOrderNumber}
            readOnly={readOnly}
            onChange={(workOrderNumber) => patch({ workOrderNumber })}
          />
          <AbsInput
            box={P1.meta[1]}
            type="date"
            value={value.date}
            readOnly={readOnly}
            onChange={(date) => patch({ date })}
          />
          <AbsInput
            box={P1.meta[2]}
            type="date"
            value={value.promisedDate}
            readOnly={readOnly}
            onChange={(promisedDate) => patch({ promisedDate })}
          />
          <AbsInput
            box={P1.meta[3]}
            value={value.advisor}
            readOnly={readOnly}
            onChange={(advisor) => patch({ advisor })}
          />

          <AbsInput
            box={{ left: P1.customer.left, line: P1.infoLines[0], width: P1.customer.width }}
            value={value.customer.name}
            readOnly={readOnly}
            onChange={(name) => patch({ customer: { ...value.customer, name } })}
          />
          <AbsInput
            box={{ left: P1.customer.left, line: P1.infoLines[1], width: P1.customer.width }}
            value={value.customer.phone}
            readOnly={readOnly}
            onChange={(phone) => patch({ customer: { ...value.customer, phone } })}
          />
          <AbsInput
            box={{ left: P1.customer.left, line: P1.infoLines[2], width: P1.customer.width }}
            value={value.customer.email}
            readOnly={readOnly}
            onChange={(email) => patch({ customer: { ...value.customer, email } })}
          />
          <AbsInput
            box={{ left: P1.customer.left, line: P1.infoLines[3], width: P1.customer.width }}
            value={value.customer.address}
            readOnly={readOnly}
            onChange={(address) => patch({ customer: { ...value.customer, address } })}
          />

          <AbsInput
            box={{ ...P1.vehicle.make, line: P1.infoLines[0] }}
            value={value.vehicle.make}
            readOnly={readOnly}
            onChange={(make) => patch({ vehicle: { ...value.vehicle, make } })}
          />
          <AbsInput
            box={{ ...P1.vehicle.model, line: P1.infoLines[0] }}
            value={value.vehicle.model}
            readOnly={readOnly}
            onChange={(model) => patch({ vehicle: { ...value.vehicle, model } })}
          />
          <AbsInput
            box={{ ...P1.vehicle.year, line: P1.infoLines[1] }}
            value={value.vehicle.year}
            readOnly={readOnly}
            onChange={(year) => patch({ vehicle: { ...value.vehicle, year } })}
          />
          <AbsInput
            box={{ ...P1.vehicle.vin, line: P1.infoLines[1] }}
            value={value.vehicle.vin}
            readOnly={readOnly}
            onChange={(vin) => patch({ vehicle: { ...value.vehicle, vin } })}
          />
          <AbsInput
            box={{ ...P1.vehicle.plate, line: P1.infoLines[2] }}
            value={value.vehicle.plate}
            readOnly={readOnly}
            onChange={(plate) => patch({ vehicle: { ...value.vehicle, plate } })}
          />
          <AbsInput
            box={{ ...P1.vehicle.mileage, line: P1.infoLines[2] }}
            value={value.vehicle.mileage}
            readOnly={readOnly}
            onChange={(mileage) => patch({ vehicle: { ...value.vehicle, mileage } })}
          />
          <AbsInput
            box={{ ...P1.vehicle.color, line: P1.infoLines[3] }}
            value={value.vehicle.color}
            readOnly={readOnly}
            onChange={(color) => patch({ vehicle: { ...value.vehicle, color } })}
          />
          <AbsInput
            box={{ ...P1.vehicle.engine, line: P1.infoLines[3] }}
            value={value.vehicle.engine}
            readOnly={readOnly}
            onChange={(engine) => patch({ vehicle: { ...value.vehicle, engine } })}
          />

          {value.services.map((line, index) => {
            const rule = `${P1.serviceLineStart + index * P1.servicePitch}%`;
            return (
              <div key={`svc-${index}`}>
                <AbsInput
                  box={{ left: "10%", line: rule, width: "66%" }}
                  value={line.description}
                  readOnly={readOnly}
                  onChange={(description) => {
                    const services = value.services.map((row, i) =>
                      i === index ? { ...row, description } : row,
                    );
                    patch({ services });
                  }}
                />
                <AbsInput
                  box={{ left: "85%", line: rule, width: "10%" }}
                  align="right"
                  inputMode="decimal"
                  value={line.estLabor ?? ""}
                  readOnly={readOnly}
                  onChange={(raw) => {
                    const services = value.services.map((row, i) =>
                      i === index
                        ? { ...row, estLabor: raw.trim() === "" ? null : Number(raw) }
                        : row,
                    );
                    patch({ services });
                  }}
                />
              </div>
            );
          })}

          <AbsArea
            box={P1.notes}
            value={value.technicianNotes}
            readOnly={readOnly}
            onChange={(technicianNotes) => patch({ technicianNotes })}
          />

          {value.parts.map((line, index) => {
            const rule = `${P1.partLineStart + index * P1.partPitch}%`;
            return (
              <div key={`part-${index}`}>
                <AbsInput
                  box={{ left: "5.5%", line: rule, width: "7%" }}
                  align="center"
                  value={line.qty ?? ""}
                  readOnly={readOnly}
                  onChange={(raw) => {
                    const parts = value.parts.map((row, i) =>
                      i === index ? { ...row, qty: raw.trim() === "" ? null : Number(raw) } : row,
                    );
                    patch({ parts });
                  }}
                />
                <AbsInput
                  box={{ left: "13.5%", line: rule, width: "34%" }}
                  value={line.description}
                  readOnly={readOnly}
                  onChange={(description) => {
                    const parts = value.parts.map((row, i) =>
                      i === index ? { ...row, description } : row,
                    );
                    patch({ parts });
                  }}
                />
                <AbsInput
                  box={{ left: "48.5%", line: rule, width: "18%" }}
                  value={line.partNumber}
                  readOnly={readOnly}
                  onChange={(partNumber) => {
                    const parts = value.parts.map((row, i) =>
                      i === index ? { ...row, partNumber } : row,
                    );
                    patch({ parts });
                  }}
                />
                <AbsInput
                  box={{ left: "70%", line: rule, width: "11%" }}
                  align="right"
                  value={line.unitPrice ?? ""}
                  readOnly={readOnly}
                  onChange={(raw) => {
                    const parts = value.parts.map((row, i) =>
                      i === index
                        ? { ...row, unitPrice: raw.trim() === "" ? null : Number(raw) }
                        : row,
                    );
                    patch({ parts });
                  }}
                />
                <AbsInput
                  box={{ left: "84%", line: rule, width: "10.5%" }}
                  align="right"
                  readOnly
                  value={line.qty || line.unitPrice ? money(partLineTotal(line)) : ""}
                />
              </div>
            );
          })}

          <AbsInput
            box={{ left: "84%", line: P1.partsTotalLine, width: "10.5%" }}
            align="right"
            readOnly
            value={money(totals.partsTotal)}
          />
        </section>
      </div>

      <div className="wo-sheet">
        <section className="wo-page wo-page-2" aria-label="Work order page 2">
          <TitleCover kind={kind} />
          <MetaLabelCover kind={kind} />

          <AbsInput
            box={P2.meta[0]}
            value={value.workOrderNumber}
            readOnly={readOnly}
            onChange={(workOrderNumber) => patch({ workOrderNumber })}
          />
          <AbsInput
            box={P2.meta[1]}
            type="date"
            value={value.date}
            readOnly={readOnly}
            onChange={(date) => patch({ date })}
          />
          <AbsInput
            box={P2.meta[2]}
            type="date"
            value={value.promisedDate}
            readOnly={readOnly}
            onChange={(promisedDate) => patch({ promisedDate })}
          />
          <AbsInput
            box={P2.meta[3]}
            value={value.advisor}
            readOnly={readOnly}
            onChange={(advisor) => patch({ advisor })}
          />

          <AbsArea
            box={{ left: "5.5%", top: "23.8%", width: "89%", height: "28.5%" }}
            value={value.workDescription}
            readOnly={readOnly}
            onChange={(workDescription) => patch({ workDescription })}
          />

          {showAuthorization ? (
            <>
              <AbsInput
                box={{ left: "18%", top: "65.1%", width: "28%", height: "1.9%" }}
                value={value.authorization.customerSignature}
                readOnly={readOnly}
                onChange={(customerSignature) =>
                  patch({ authorization: { ...value.authorization, customerSignature } })
                }
              />
              <AbsInput
                box={{ left: "52%", top: "65.1%", width: "14%", height: "1.9%" }}
                type="date"
                value={value.authorization.date}
                readOnly={readOnly}
                onChange={(date) => patch({ authorization: { ...value.authorization, date } })}
              />
              <input
                className="wo-check"
                style={{ left: "6.5%", top: "68.3%" }}
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
                aria-label="Receive text or email updates"
              />
              <AbsInput
                box={{ left: "13.5%", top: "87.2%", width: "28%", height: "1.9%" }}
                value={value.authorization.paymentSignature}
                readOnly={readOnly}
                onChange={(paymentSignature) =>
                  patch({ authorization: { ...value.authorization, paymentSignature } })
                }
              />
              <AbsInput
                box={{ left: "48%", top: "87.2%", width: "14%", height: "1.9%" }}
                type="date"
                value={value.authorization.paymentDate}
                readOnly={readOnly}
                onChange={(paymentDate) =>
                  patch({ authorization: { ...value.authorization, paymentDate } })
                }
              />
            </>
          ) : (
            <div className="wo-estimate-banner">
              This estimate is based on the information available at the time of writing. Final
              charges may change after diagnosis or if additional parts/labor are required. No work
              will be performed without your approval.
            </div>
          )}

          <AbsInput
            box={{ left: "82%", top: "54%", width: "13%", height: "1.9%" }}
            align="right"
            readOnly
            value={money(totals.laborTotal)}
          />
          <AbsInput
            box={{ left: "82%", top: "57.3%", width: "13%", height: "1.9%" }}
            align="right"
            readOnly
            value={money(totals.partsTotal)}
          />
          <AbsInput
            box={{ left: "82%", top: "61.1%", width: "13%", height: "1.9%" }}
            align="right"
            readOnly
            value={money(totals.subtotal)}
          />
          <AbsInput
            box={{ left: "72%", top: "64.7%", width: "6%", height: "1.9%" }}
            align="center"
            value={value.summary.taxPercent}
            readOnly={readOnly}
            onChange={(raw) =>
              patch({
                summary: { ...value.summary, taxPercent: Number(raw) || 0 },
              })
            }
          />
          <AbsInput
            box={{ left: "82%", top: "64.7%", width: "13%", height: "1.9%" }}
            align="right"
            readOnly
            value={money(totals.taxAmount)}
          />
          <AbsInput
            box={{ left: "82%", top: "68.5%", width: "13%", height: "1.9%" }}
            align="right"
            value={value.summary.excise || ""}
            readOnly={readOnly}
            onChange={(raw) =>
              patch({
                summary: {
                  ...value.summary,
                  excise: raw.trim() === "" ? 0 : Number(raw) || 0,
                },
              })
            }
          />
          <AbsInput
            box={{ left: "78%", top: "71%", width: "16%", height: "3%" }}
            align="right"
            className="wo-total-input"
            readOnly
            value={money(totals.totalDue)}
            aria-label={totalLabel}
          />

          <AbsArea
            box={{ left: "58%", top: "78%", width: "36.5%", height: "12%" }}
            value={value.notes}
            readOnly={readOnly}
            onChange={(notes) => patch({ notes })}
          />
        </section>
      </div>
    </div>
  );
}
