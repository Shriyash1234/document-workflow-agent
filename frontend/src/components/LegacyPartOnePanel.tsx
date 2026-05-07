import { FormEvent } from "react";
import type { SampleOutput, StoredRun, ValidationResult } from "../types";

const fieldLabels: Record<string, string> = {
  consignee_name: "Consignee",
  hs_code: "HS Code",
  port_of_loading: "Port of Loading",
  port_of_discharge: "Port of Discharge",
  incoterms: "Incoterms",
  description_of_goods: "Description",
  gross_weight: "Gross Weight",
  invoice_number: "Invoice Number",
};

export function LegacyPartOnePanel({
  busy,
  run,
  samples,
  onRunSample,
  onUpload,
}: {
  busy: boolean;
  run: StoredRun | null;
  samples: SampleOutput[];
  onRunSample: (samplePath: string) => void;
  onUpload: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <details className="legacy-panel">
      <summary>Part 1 single-document pipeline</summary>
      <section className="control-grid">
        <div className="panel">
          <h2>Run Samples</h2>
          <div className="sample-list">
            {samples.map((sample) => (
              <button key={sample.pdf} onClick={() => onRunSample(sample.pdf)} disabled={busy}>
                {labelSample(sample.pdf)}
              </button>
            ))}
          </div>
        </div>

        <form className="panel" onSubmit={onUpload}>
          <h2>Upload Document</h2>
          <input name="document" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" />
          <button disabled={busy} type="submit">
            Run Pipeline
          </button>
        </form>
      </section>
      <RunView run={run} />
    </details>
  );
}

function RunView({ run }: { run: StoredRun | null }) {
  if (!run) {
    return (
      <section className="empty-state">
        <h2>No run selected</h2>
        <p>Run a clean or messy sample, or upload a PDF/image to see the pipeline state.</p>
      </section>
    );
  }

  return (
    <section className="run-grid">
      <div className="panel run-summary">
        <h2>Pipeline Run</h2>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>{run.status}</dd>
          </div>
          <div>
            <dt>Outcome</dt>
            <dd className={`outcome ${run.outcome ?? ""}`}>{formatOutcome(run.outcome)}</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>{run.sourceType}</dd>
          </div>
          <div>
            <dt>Document</dt>
            <dd>{run.documents[0]?.fileName ?? "Unknown"}</dd>
          </div>
        </dl>
      </div>

      <FieldsTable run={run} />
      <ValidationTable run={run} />
      <DecisionPanel run={run} />
    </section>
  );
}

function FieldsTable({ run }: { run: StoredRun }) {
  return (
    <div className="panel">
      <h2>Extracted Fields</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
            <th>Confidence</th>
            <th>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {run.extraction &&
            Object.entries(run.extraction.fields).map(([fieldKey, field]) => (
              <tr key={fieldKey}>
                <td>{fieldLabels[fieldKey] ?? fieldKey}</td>
                <td>{field.value ?? "-"}</td>
                <td>{formatConfidence(field.confidence)}</td>
                <td>{field.evidence ?? "-"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationTable({ run }: { run: StoredRun }) {
  return (
    <div className="panel">
      <h2>Validation</h2>
      <div className="counts">
        <span>Match {run.validation?.counts.match ?? 0}</span>
        <span>Mismatch {run.validation?.counts.mismatch ?? 0}</span>
        <span>Uncertain {run.validation?.counts.uncertain ?? 0}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Result</th>
            <th>Found</th>
            <th>Expected</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>{run.validation?.results.map((result) => <ValidationRow key={result.fieldKey} result={result} />)}</tbody>
      </table>
    </div>
  );
}

function DecisionPanel({ run }: { run: StoredRun }) {
  return (
    <div className="panel decision-panel">
      <h2>Decision</h2>
      <p className={`outcome ${run.decision?.outcome ?? ""}`}>{formatOutcome(run.decision?.outcome ?? null)}</p>
      <p>{run.decision?.reasoning}</p>
      {run.decision?.amendmentDraft && <pre>{run.decision.amendmentDraft}</pre>}
    </div>
  );
}

function ValidationRow({ result }: { result: ValidationResult }) {
  return (
    <tr>
      <td>{fieldLabels[result.fieldKey] ?? result.fieldKey}</td>
      <td>
        <span className={`result-badge ${result.result}`}>{result.result}</span>
      </td>
      <td>{result.found ?? "-"}</td>
      <td>{result.expected ?? "-"}</td>
      <td>{result.reason}</td>
    </tr>
  );
}

function labelSample(path: string) {
  return path
    .replace(".pdf", "")
    .split("/")
    .map((part) => part.replaceAll("-", " "))
    .join(" / ");
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatOutcome(outcome: string | null) {
  return outcome ? outcome.replaceAll("_", " ") : "-";
}
