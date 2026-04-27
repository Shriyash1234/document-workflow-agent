import { FormEvent, useEffect, useMemo, useState } from "react";
import { askQuery, getHealth, getSamples, runSample, uploadDocument } from "./api";
import type { QueryResult, SampleOutput, StoredRun, ValidationResult } from "./types";

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

function App() {
  const [health, setHealth] = useState("Checking");
  const [samples, setSamples] = useState<SampleOutput[]>([]);
  const [run, setRun] = useState<StoredRun | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [query, setQuery] = useState("how many shipments were flagged this week?");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHealth(), getSamples()])
      .then(([healthResponse, sampleOutputs]) => {
        setHealth(healthResponse.geminiConfigured ? "Ready" : "Gemini key missing");
        setSamples(sampleOutputs);
      })
      .catch((caught: Error) => {
        setHealth("Backend unavailable");
        setError(caught.message);
      });
  }, []);

  const visibleSamples = useMemo(
    () =>
      samples.filter((sample) =>
        ["clean/commercial-invoice.pdf", "messy/commercial-invoice-messy.pdf", "clean/bill-of-lading.pdf"].includes(
          sample.pdf,
        ),
      ),
    [samples],
  );

  async function runAction(label: string, action: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSample(samplePath: string) {
    await runAction("Running sample", async () => {
      setRun(await runSample(samplePath));
    });
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("document") as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      setError("Choose a PDF or image first.");
      return;
    }

    await runAction("Uploading document", async () => {
      setRun(await uploadDocument(file));
      form.reset();
    });
  }

  async function handleQuery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction("Asking query agent", async () => {
      setQueryResult(await askQuery(query));
    });
  }

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <h1>Agentic Workflow</h1>
          <p>Trade document extraction, validation, routing, storage, and query.</p>
        </div>
        <span className={`status-pill ${health === "Ready" ? "good" : "warn"}`}>{health}</span>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {busy && <div className="progress-banner">{busy}...</div>}

      <section className="control-grid">
        <div className="panel">
          <h2>Run Samples</h2>
          <div className="sample-list">
            {visibleSamples.map((sample) => (
              <button key={sample.pdf} onClick={() => handleSample(sample.pdf)} disabled={Boolean(busy)}>
                {labelSample(sample.pdf)}
              </button>
            ))}
          </div>
        </div>

        <form className="panel" onSubmit={handleUpload}>
          <h2>Upload Document</h2>
          <input name="document" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" />
          <button disabled={Boolean(busy)} type="submit">
            Run Pipeline
          </button>
        </form>
      </section>

      <RunView run={run} />

      <section className="panel query-panel">
        <h2>Query Stored Output</h2>
        <form onSubmit={handleQuery} className="query-form">
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
          <button disabled={Boolean(busy)} type="submit">
            Ask
          </button>
        </form>
        {queryResult && (
          <div className="query-result">
            <p className="answer">{queryResult.answer}</p>
            <details>
              <summary>SQL and rows</summary>
              <pre>{queryResult.sql}</pre>
              <pre>{JSON.stringify(queryResult.rows, null, 2)}</pre>
            </details>
          </div>
        )}
      </section>
    </main>
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

export default App;
