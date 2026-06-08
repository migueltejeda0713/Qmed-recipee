import { useEffect, useRef, useState } from "react";
import "../styles/RecipePrintView.css";

const PAPER_DIMS = {
  media:  "139.7mm 215.9mm",
  a5:     "148mm 210mm",
  carta:  "215.9mm 279.4mm",
};

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-DO", { day: "2-digit", month: "long", year: "numeric" });
}

const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

const IconRx = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h6a3 3 0 0 1 0 6H4z"/>
    <path d="M4 10v10"/>
    <path d="M4 13h4"/>
    <path d="M13 14l7 7"/>
    <path d="M20 14l-7 7"/>
  </svg>
);

export default function RecipePrintView({ document: doc, onClose }) {
  const [size, setSize] = useState("media");
  const printedRef = useRef(false);

  useEffect(() => {
    if (!doc || printedRef.current) return;
    printedRef.current = true;
    const t = setTimeout(() => window.print(), 80);
    return () => clearTimeout(t);
  }, [doc]);

  useEffect(() => {
    const handler = () => onClose?.();
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [onClose]);

  if (!doc) return null;

  const fecha = formatDate(doc.issued_at);

  return (
    <div className="rpv-screen">
      {/* Inline @page rule — changes with paper size selector */}
      <style>{`@media print { @page { size: ${PAPER_DIMS[size]}; margin: 0; } }`}</style>

      {/* ── Toolbar (screen only) ──────────────────────── */}
      <div className="rpv-toolbar no-print">
        <div className="rpv-toolbar-left">
          <span className="rpv-toolbar-title">Vista previa de impresión</span>
          <div className="rpv-paper-seg">
            {[["media", "Media carta"], ["a5", "A5"], ["carta", "Carta"]].map(([key, label]) => (
              <button
                key={key}
                className={size === key ? "active" : ""}
                onClick={() => setSize(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="rpv-toolbar-right">
          <button className="rpv-btn-close" onClick={onClose}>Cerrar</button>
          <button className="rpv-btn-print" onClick={() => window.print()}>
            <IconPrint /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* ── Scrollable preview area ────────────────────── */}
      <div className="rpv-scroll">
        <div className={`rpv-paper rpv-paper-${size}`}>

          {/* Membrete */}
          <div className="rpv-head">
            <div className="rpv-head-left">
              <div className="rpv-rx-mark"><IconRx /></div>
              <div>
                <div className="rpv-doc-name">{doc.doctor_name || "Médico"}</div>
              </div>
            </div>
            <div className="rpv-creds">
              <div className="rpv-folio">N° {doc.recipe_number}</div>
              {doc.doctor_license && <div>Exequátur: <strong>{doc.doctor_license}</strong></div>}
            </div>
          </div>
          <hr className="rpv-rule" />

          {/* Paciente */}
          <div className="rpv-patient">
            <div className="rpv-pt-left">
              <div className="rpv-pt-nameline">
                <span className="rpv-pt-label">Paciente</span>
                <span className="rpv-pt-name">{doc.patient_name || "—"}</span>
              </div>
              {doc.patient_document && (
                <div className="rpv-pt-sub">{doc.patient_document}</div>
              )}
            </div>
            <div className="rpv-pt-date">
              <span className="rpv-pt-label">Fecha&nbsp;</span>
              {fecha}
            </div>
          </div>

          {/* Observaciones / diagnóstico */}
          {doc.general_notes && (
            <div className="rpv-dx">
              <span className="rpv-pt-label">Observaciones&nbsp;</span>
              <span className="rpv-dx-text">{doc.general_notes}</span>
            </div>
          )}

          {/* Rp. */}
          <div className="rpv-rp">
            <div className="rpv-rp-symbol">Rp.</div>
            <div className="rpv-rx-items">
              {(doc.prescriptions || []).map((p) => (
                <div key={p.id} className="rpv-rx-item">
                  <div className="rpv-rx-drug">{p.name}</div>
                  <div className="rpv-rx-line">
                    {p.quantity && <span><b>Cantidad:</b> {p.quantity}</span>}
                    {p.dosage   && <span><b>Posología:</b> {p.dosage}</span>}
                  </div>
                  {p.usage_instructions && (
                    <div className="rpv-rx-usage">{p.usage_instructions}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer — firma y sello */}
          <div className="rpv-foot">
            <hr className="rpv-rule-thin" />
            <div className="rpv-sign-row">
              <div className="rpv-stamp">Sello</div>
              <div className="rpv-sign-block">
                <div className="rpv-sign-line">
                  <div className="rpv-sign-name">{doc.doctor_name || "Médico"}</div>
                  {doc.doctor_license && (
                    <div className="rpv-sign-sub">{doc.doctor_license}</div>
                  )}
                </div>
              </div>
            </div>
            <div className="rpv-legal">
              Receta médica expedida conforme a la Ley General de Salud No. 42-01.
              Documento válido únicamente con la firma y sello del médico tratante.
              {" "}<span className="no-print">· Impresión #{doc.print_count}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
