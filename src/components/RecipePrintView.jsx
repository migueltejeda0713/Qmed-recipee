import { useEffect, useRef } from "react";
import "../styles/RecipePrintView.css";

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-DO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecipePrintView({ document: doc, onClose }) {
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

  return (
    <div className="rx-print-backdrop" role="dialog" aria-modal="true">
      <div className="rx-print-sheet">
        <div className="rx-print-toolbar no-print">
          <button type="button" className="rx-print-close" onClick={onClose}>Cerrar</button>
          <button type="button" className="rx-print-trigger" onClick={() => window.print()}>
            Imprimir
          </button>
        </div>

        <header className="rx-doc-header">
          <div>
            <div className="rx-doc-title">Receta Médica</div>
            <div className="rx-doc-number">N° {doc.recipe_number}</div>
          </div>
          <div className="rx-doc-issued">
            <div className="rx-doc-label">Emitida</div>
            <div className="rx-doc-value">{formatDateTime(doc.issued_at)}</div>
          </div>
        </header>

        <section className="rx-doc-grid">
          <div>
            <div className="rx-doc-label">Médico</div>
            <div className="rx-doc-value">{doc.doctor_name || "—"}</div>
            {doc.doctor_license && (
              <div className="rx-doc-sub">Exequátur: {doc.doctor_license}</div>
            )}
          </div>
          <div>
            <div className="rx-doc-label">Paciente</div>
            <div className="rx-doc-value">{doc.patient_name || "—"}</div>
            {doc.patient_document && (
              <div className="rx-doc-sub">Documento: {doc.patient_document}</div>
            )}
          </div>
        </section>

        <section className="rx-doc-presc">
          <h3>Prescripciones</h3>
          <ol>
            {(doc.prescriptions || []).map((p) => (
              <li key={p.id}>
                <div className="rx-presc-name">{p.name}</div>
                <div className="rx-presc-meta">
                  <span><strong>Cantidad:</strong> {p.quantity}</span>
                  <span><strong>Dosis:</strong> {p.dosage}</span>
                </div>
                {p.usage_instructions && (
                  <div className="rx-presc-usage">{p.usage_instructions}</div>
                )}
              </li>
            ))}
          </ol>
        </section>

        {doc.general_notes && (
          <section className="rx-doc-notes">
            <div className="rx-doc-label">Observaciones</div>
            <div>{doc.general_notes}</div>
          </section>
        )}

        <footer className="rx-doc-footer">
          <div className="rx-doc-signature">
            <div className="rx-doc-signature-line" />
            <div className="rx-doc-sub">Firma del médico</div>
          </div>
          <div className="rx-doc-print-count no-print">
            Impresión #{doc.print_count}
          </div>
        </footer>
      </div>
    </div>
  );
}
