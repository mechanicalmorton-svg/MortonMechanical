"use client";

import type { HTMLAttributes } from "react";
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
  top: string;
  width: string;
  height?: string;
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
  className = "",
  inputMode,
}: {
  box: Box;
  value: string | number;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: string;
  align?: "left" | "right" | "center";
  className?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <input
      className={`wo-abs-input ${className}`}
      style={{
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height ?? "2.1%",
        textAlign: align,
      }}
      type={type}
      inputMode={inputMode}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
    />
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
        .wo-page-1 {
          background-image: url("/documents/workorder-page-1.png");
        }
        .wo-page-2 {
          background-image: url("/documents/workorder-page-2.png");
        }
        .wo-abs-input,
        .wo-abs-area {
          position: absolute;
          margin: 0;
          border: 0;
          outline: none;
          background: transparent;
          color: #0b1b33;
          font: inherit;
          font-size: clamp(9px, 1.15vw, 12px);
          line-height: 1.2;
          padding: 0 2px;
          box-sizing: border-box;
        }
        .wo-abs-area {
          resize: none;
          line-height: 1.55;
          overflow: hidden;
        }
        .wo-abs-input:focus,
        .wo-abs-area:focus {
          background: rgba(0, 168, 255, 0.08);
          box-shadow: inset 0 -1px 0 var(--wo-cyan);
        }
        .wo-abs-input[readonly],
        .wo-abs-area[readonly] {
          cursor: default;
        }
        .wo-title-cover {
          position: absolute;
          left: 28%;
          top: 3.4%;
          width: 34%;
          height: 4.2%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--wo-navy);
          color: #fff;
          font-size: clamp(16px, 2.4vw, 28px);
          font-weight: 800;
          letter-spacing: 0.06em;
          z-index: 2;
        }
        .wo-check {
          position: absolute;
          width: 1.5%;
          height: 1%;
          accent-color: var(--wo-cyan);
        }
        .wo-meta-label-cover {
          position: absolute;
          left: 71.5%;
          top: 2.7%;
          width: 24%;
          height: 2%;
          background: var(--wo-navy);
          color: var(--wo-cyan);
          font-size: clamp(8px, 1vw, 10px);
          font-weight: 700;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          z-index: 2;
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
        @media print {
          @page {
            size: 8.5in 12.75in;
            margin: 0;
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
            inset: 0;
            width: 100%;
            margin: 0 !important;
            max-width: none !important;
          }
          .wo-sheet {
            width: 8.5in;
            margin: 0;
          }
          .wo-page {
            width: 8.5in;
            height: 12.75in;
            aspect-ratio: auto;
            margin: 0;
            box-shadow: none;
            break-after: page;
            page-break-after: always;
          }
          .wo-page:last-child {
            break-after: auto;
            page-break-after: auto;
          }
          .wo-abs-input:focus,
          .wo-abs-area:focus {
            background: transparent !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="wo-sheet">
        <section className="wo-page wo-page-1" aria-label="Work order page 1">
          <TitleCover kind={kind} />
          {kind !== "work-order" ? (
            <div className="wo-meta-label-cover">
              {kind === "estimate" ? "ESTIMATE #:" : "INVOICE #:"}
            </div>
          ) : null}

          <AbsInput
            box={{ left: "78%", top: "3.5%", width: "17%" }}
            value={value.workOrderNumber}
            readOnly={readOnly}
            onChange={(workOrderNumber) => patch({ workOrderNumber })}
          />
          <AbsInput
            box={{ left: "78%", top: "6.4%", width: "17%" }}
            type="date"
            value={value.date}
            readOnly={readOnly}
            onChange={(date) => patch({ date })}
          />
          <AbsInput
            box={{ left: "78%", top: "9.3%", width: "17%" }}
            type="date"
            value={value.promisedDate}
            readOnly={readOnly}
            onChange={(promisedDate) => patch({ promisedDate })}
          />
          <AbsInput
            box={{ left: "78%", top: "12.2%", width: "17%" }}
            value={value.advisor}
            readOnly={readOnly}
            onChange={(advisor) => patch({ advisor })}
          />

          <AbsInput
            box={{ left: "12%", top: "20.8%", width: "34%" }}
            value={value.customer.name}
            readOnly={readOnly}
            onChange={(name) => patch({ customer: { ...value.customer, name } })}
          />
          <AbsInput
            box={{ left: "12%", top: "23.8%", width: "34%" }}
            value={value.customer.phone}
            readOnly={readOnly}
            onChange={(phone) => patch({ customer: { ...value.customer, phone } })}
          />
          <AbsInput
            box={{ left: "12%", top: "26.8%", width: "34%" }}
            value={value.customer.email}
            readOnly={readOnly}
            onChange={(email) => patch({ customer: { ...value.customer, email } })}
          />
          <AbsInput
            box={{ left: "12%", top: "29.8%", width: "34%" }}
            value={value.customer.address}
            readOnly={readOnly}
            onChange={(address) => patch({ customer: { ...value.customer, address } })}
          />

          <AbsInput
            box={{ left: "55%", top: "20.8%", width: "16%" }}
            value={value.vehicle.make}
            readOnly={readOnly}
            onChange={(make) => patch({ vehicle: { ...value.vehicle, make } })}
          />
          <AbsInput
            box={{ left: "78%", top: "20.8%", width: "16%" }}
            value={value.vehicle.model}
            readOnly={readOnly}
            onChange={(model) => patch({ vehicle: { ...value.vehicle, model } })}
          />
          <AbsInput
            box={{ left: "55%", top: "23.8%", width: "16%" }}
            value={value.vehicle.year}
            readOnly={readOnly}
            onChange={(year) => patch({ vehicle: { ...value.vehicle, year } })}
          />
          <AbsInput
            box={{ left: "78%", top: "23.8%", width: "16%" }}
            value={value.vehicle.vin}
            readOnly={readOnly}
            onChange={(vin) => patch({ vehicle: { ...value.vehicle, vin } })}
          />
          <AbsInput
            box={{ left: "55%", top: "26.8%", width: "16%" }}
            value={value.vehicle.plate}
            readOnly={readOnly}
            onChange={(plate) => patch({ vehicle: { ...value.vehicle, plate } })}
          />
          <AbsInput
            box={{ left: "78%", top: "26.8%", width: "16%" }}
            value={value.vehicle.mileage}
            readOnly={readOnly}
            onChange={(mileage) => patch({ vehicle: { ...value.vehicle, mileage } })}
          />
          <AbsInput
            box={{ left: "55%", top: "29.8%", width: "16%" }}
            value={value.vehicle.color}
            readOnly={readOnly}
            onChange={(color) => patch({ vehicle: { ...value.vehicle, color } })}
          />
          <AbsInput
            box={{ left: "78%", top: "29.8%", width: "16%" }}
            value={value.vehicle.engine}
            readOnly={readOnly}
            onChange={(engine) => patch({ vehicle: { ...value.vehicle, engine } })}
          />

          {value.services.map((line, index) => {
            const top = `${36.6 + index * 2.55}%`;
            return (
              <div key={`svc-${index}`}>
                <AbsInput
                  box={{ left: "10%", top, width: "66%", height: "2.2%" }}
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
                  box={{ left: "84%", top, width: "10%", height: "2.2%" }}
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
            box={{ left: "5.5%", top: "54.2%", width: "89%", height: "8.2%" }}
            value={value.technicianNotes}
            readOnly={readOnly}
            onChange={(technicianNotes) => patch({ technicianNotes })}
          />

          {value.parts.map((line, index) => {
            const top = `${67.35 + index * 2.05}%`;
            return (
              <div key={`part-${index}`}>
                <AbsInput
                  box={{ left: "5.5%", top, width: "7%", height: "1.9%" }}
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
                  box={{ left: "13.5%", top, width: "34%", height: "1.9%" }}
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
                  box={{ left: "48.5%", top, width: "18%", height: "1.9%" }}
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
                  box={{ left: "70%", top, width: "11%", height: "1.9%" }}
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
                  box={{ left: "84%", top, width: "10%", height: "1.9%" }}
                  align="right"
                  readOnly
                  value={line.qty || line.unitPrice ? money(partLineTotal(line)) : ""}
                />
              </div>
            );
          })}

          <AbsInput
            box={{ left: "84%", top: "88.2%", width: "10%", height: "2%" }}
            align="right"
            readOnly
            value={money(totals.partsTotal)}
          />
        </section>
      </div>

      <div className="wo-sheet">
        <section className="wo-page wo-page-2" aria-label="Work order page 2">
          <TitleCover kind={kind} />
          {kind !== "work-order" ? (
            <div className="wo-meta-label-cover">
              {kind === "estimate" ? "ESTIMATE #:" : "INVOICE #:"}
            </div>
          ) : null}

          <AbsInput
            box={{ left: "78%", top: "3.5%", width: "17%" }}
            value={value.workOrderNumber}
            readOnly={readOnly}
            onChange={(workOrderNumber) => patch({ workOrderNumber })}
          />
          <AbsInput
            box={{ left: "78%", top: "6.4%", width: "17%" }}
            type="date"
            value={value.date}
            readOnly={readOnly}
            onChange={(date) => patch({ date })}
          />
          <AbsInput
            box={{ left: "78%", top: "9.3%", width: "17%" }}
            type="date"
            value={value.promisedDate}
            readOnly={readOnly}
            onChange={(promisedDate) => patch({ promisedDate })}
          />
          <AbsInput
            box={{ left: "78%", top: "12.2%", width: "17%" }}
            value={value.advisor}
            readOnly={readOnly}
            onChange={(advisor) => patch({ advisor })}
          />

          <AbsArea
            box={{ left: "5.5%", top: "19%", width: "89%", height: "28%" }}
            value={value.workDescription}
            readOnly={readOnly}
            onChange={(workDescription) => patch({ workDescription })}
          />

          {showAuthorization ? (
            <>
              <AbsInput
                box={{ left: "22%", top: "58.8%", width: "28%", height: "2%" }}
                value={value.authorization.customerSignature}
                readOnly={readOnly}
                onChange={(customerSignature) =>
                  patch({ authorization: { ...value.authorization, customerSignature } })
                }
              />
              <AbsInput
                box={{ left: "58%", top: "58.8%", width: "14%", height: "2%" }}
                type="date"
                value={value.authorization.date}
                readOnly={readOnly}
                onChange={(date) => patch({ authorization: { ...value.authorization, date } })}
              />
              <input
                className="wo-check"
                style={{ left: "7.2%", top: "62.4%" }}
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
                box={{ left: "18%", top: "74.8%", width: "28%", height: "2%" }}
                value={value.authorization.paymentSignature}
                readOnly={readOnly}
                onChange={(paymentSignature) =>
                  patch({ authorization: { ...value.authorization, paymentSignature } })
                }
              />
              <AbsInput
                box={{ left: "54%", top: "74.8%", width: "14%", height: "2%" }}
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
            box={{ left: "82%", top: "54.6%", width: "12%", height: "2%" }}
            align="right"
            readOnly
            value={money(totals.laborTotal)}
          />
          <AbsInput
            box={{ left: "82%", top: "57.4%", width: "12%", height: "2%" }}
            align="right"
            readOnly
            value={money(totals.partsTotal)}
          />
          <AbsInput
            box={{ left: "82%", top: "60.2%", width: "12%", height: "2%" }}
            align="right"
            readOnly
            value={money(totals.subtotal)}
          />
          <AbsInput
            box={{ left: "72%", top: "63%", width: "6%", height: "2%" }}
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
            box={{ left: "82%", top: "63%", width: "12%", height: "2%" }}
            align="right"
            readOnly
            value={money(totals.taxAmount)}
          />
          <AbsInput
            box={{ left: "82%", top: "65.8%", width: "12%", height: "2%" }}
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
            box={{ left: "78%", top: "69.2%", width: "16%", height: "2.6%" }}
            align="right"
            className="wo-total-input"
            readOnly
            value={money(totals.totalDue)}
            aria-label={totalLabel}
          />

          <AbsArea
            box={{ left: "58%", top: "76.5%", width: "36.5%", height: "10%" }}
            value={value.notes}
            readOnly={readOnly}
            onChange={(notes) => patch({ notes })}
          />
        </section>
      </div>
    </div>
  );
}
