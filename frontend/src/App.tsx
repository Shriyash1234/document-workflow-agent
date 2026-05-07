import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  askQuery,
  getHealth,
  getInbox,
  getSamples,
  processInboxEmail,
  runSample,
  uploadDocument,
} from "./api";
import type {
  CrossDocumentResult,
  InboxEmail,
  QueryResult,
  SampleOutput,
  ShipmentVerification,
  StoredRun,
  ValidationResult,
} from "./types";

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
  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [shipment, setShipment] = useState<ShipmentVerification | null>(null);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<CrossDocumentResult | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [run, setRun] = useState<StoredRun | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [query, setQuery] = useState("show me everything pending review for customer Atlas Retail India");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHealth(), getSamples(), getInbox()])
      .then(([healthResponse, sampleOutputs, inboxEmails]) => {
        setHealth(healthResponse.geminiConfigured ? "Ready" : "Gemini key missing");
        setSamples(sampleOutputs);
        setInbox(inboxEmails);
        setShipment(inboxEmails.find((email) => email.latestShipment)?.latestShipment ?? null);
      })
      .catch((caught: Error) => {
        setHealth("Backend unavailable");
        setError(caught.message);
      });
  }, []);

  useEffect(() => {
    setDraftReply(shipment?.decision?.draftReply ?? "");
    setSelectedDiscrepancy(shipment?.crossDocumentResults.find((result) => result.result !== "match") ?? null);
  }, [shipment]);

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

  async function handleProcessEmail(emailId: string) {
    await runAction("Processing email", async () => {
      const processedShipment = await processInboxEmail(emailId);
      setShipment(processedShipment);
      setInbox(await getInbox());
    });
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
          <h1>CG Document Verification</h1>
          <p>Supplier email intake, multi-document verification, amendment drafting, and stored-data query.</p>
        </div>
        <span className={`status-pill ${health === "Ready" ? "good" : "warn"}`}>{health}</span>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {busy && <div className="progress-banner">{busy}...</div>}

      <section className="workflow-grid">
        <InboxPanel inbox={inbox} busy={Boolean(busy)} onProcess={handleProcessEmail} onSelect={setShipment} />
        <ShipmentSummary shipment={shipment} />
      </section>

      <ShipmentView
        shipment={shipment}
        draftReply={draftReply}
        selectedDiscrepancy={selectedDiscrepancy}
        onDraftChange={setDraftReply}
        onSelectDiscrepancy={setSelectedDiscrepancy}
      />

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

      <details className="part-one">
        <summary>Part 1 single-document pipeline</summary>
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
      </details>
    </main>
  );
}

function InboxPanel({
  inbox,
  busy,
  onProcess,
  onSelect,
}: {
  inbox: InboxEmail[];
  busy: boolean;
  onProcess: (emailId: string) => void;
  onSelect: (shipment: ShipmentVerification | null) => void;
}) {
  return (
    <section className="panel">
      <h2>Incoming SU Emails</h2>
      <div className="inbox-list">
        {inbox.map((email) => (
          <article key={email.emailId} className="email-card">
            <div className="email-head">
              <div>
                <strong>{email.subject}</strong>
                <p>{email.from}</p>
              </div>
              <span className={`status-pill ${email.latestShipment ? "good" : "warn"}`}>
                {email.latestShipment?.decision?.outcome ?? email.status}
              </span>
            </div>
            <dl className="email-meta">
              <div>
                <dt>Customer</dt>
                <dd>{email.customer}</dd>
              </div>
              <div>
                <dt>Received</dt>
                <dd>{formatDate(email.receivedAt)}</dd>
              </div>
              <div>
                <dt>Attachments</dt>
                <dd>{email.attachments.map((attachment) => attachment.fileName).join(", ")}</dd>
              </div>
            </dl>
            <div className="email-actions">
              <button disabled={busy} onClick={() => onProcess(email.emailId)}>
                Process Email
              </button>
              <button disabled={!email.latestShipment} onClick={() => onSelect(email.latestShipment)}>
                View Result
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ShipmentSummary({ shipment }: { shipment: ShipmentVerification | null }) {
  const mismatches = shipment?.crossDocumentResults.filter((result) => result.result === "mismatch").length ?? 0;
  const uncertain = shipment?.crossDocumentResults.filter((result) => result.result === "uncertain").length ?? 0;

  return (
    <section className="panel summary-panel">
      <h2>Verification Summary</h2>
      {!shipment ? (
        <p>Select an incoming email and process it to see the CG decision.</p>
      ) : (
        <>
          <p className={`outcome ${shipment.decision?.outcome ?? shipment.status}`}>
            {formatOutcome(shipment.decision?.outcome ?? shipment.status)}
          </p>
          <dl>
            <div>
              <dt>Documents</dt>
              <dd>{shipment.documents.length}</dd>
            </div>
            <div>
              <dt>Mismatches</dt>
              <dd>{mismatches}</dd>
            </div>
            <div>
              <dt>Uncertain</dt>
              <dd>{uncertain}</dd>
            </div>
            <div>
              <dt>Reason</dt>
              <dd>{shipment.decision?.reasoning ?? shipment.errorMessage ?? "-"}</dd>
            </div>
          </dl>
        </>
      )}
    </section>
  );
}

function ShipmentView({
  shipment,
  draftReply,
  selectedDiscrepancy,
  onDraftChange,
  onSelectDiscrepancy,
}: {
  shipment: ShipmentVerification | null;
  draftReply: string;
  selectedDiscrepancy: CrossDocumentResult | null;
  onDraftChange: (value: string) => void;
  onSelectDiscrepancy: (result: CrossDocumentResult) => void;
}) {
  if (!shipment) {
    return (
      <section className="empty-state">
        <h2>No shipment selected</h2>
        <p>Process a simulated supplier email to view document results, cross-document checks, and a draft reply.</p>
      </section>
    );
  }

  return (
    <section className="shipment-grid">
      <DocumentResults documents={shipment.documents} />
      <CrossDocumentTable results={shipment.crossDocumentResults} onSelect={onSelectDiscrepancy} />
      <DiscrepancyDetail result={selectedDiscrepancy} />
      <DraftReply draftReply={draftReply} onDraftChange={onDraftChange} />
    </section>
  );
}

function DocumentResults({ documents }: { documents: ShipmentVerification["documents"] }) {
  return (
    <section className="panel">
      <h2>Document-Level Results</h2>
      <table>
        <thead>
          <tr>
            <th>Document</th>
            <th>Type</th>
            <th>Matches</th>
            <th>Mismatches</th>
            <th>Uncertain</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.documentId}>
              <td>{document.fileName}</td>
              <td>{formatOutcome(document.documentType)}</td>
              <td>{document.validation.counts.match}</td>
              <td>{document.validation.counts.mismatch}</td>
              <td>{document.validation.counts.uncertain}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function CrossDocumentTable({
  results,
  onSelect,
}: {
  results: CrossDocumentResult[];
  onSelect: (result: CrossDocumentResult) => void;
}) {
  return (
    <section className="panel">
      <h2>Cross-Document Checks</h2>
      <table>
        <thead>
          <tr>
            <th>Field</th>
            <th>Result</th>
            <th>Values</th>
            <th>Reason</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr
              key={result.fieldKey}
              className={result.result !== "match" ? "clickable-row" : undefined}
              onClick={() => onSelect(result)}
            >
              <td>{fieldLabels[result.fieldKey] ?? result.fieldKey}</td>
              <td>
                <span className={`result-badge ${result.result}`}>{result.result}</span>
              </td>
              <td>
                {result.valuesByDocument.map((value) => (
                  <div key={`${result.fieldKey}-${value.fileName}`}>
                    {value.fileName}: {value.value ?? "-"}
                  </div>
                ))}
              </td>
              <td>{result.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function DiscrepancyDetail({ result }: { result: CrossDocumentResult | null }) {
  return (
    <section className="panel">
      <h2>Discrepancy Detail</h2>
      {!result ? (
        <p>No flagged cross-document field selected.</p>
      ) : (
        <>
          <p>
            <strong>{fieldLabels[result.fieldKey] ?? result.fieldKey}</strong> is marked as{" "}
            <span className={`result-badge ${result.result}`}>{result.result}</span>
          </p>
          <table>
            <thead>
              <tr>
                <th>Document</th>
                <th>Value</th>
                <th>Confidence</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {result.valuesByDocument.map((value) => (
                <tr key={`${result.fieldKey}-detail-${value.fileName}`}>
                  <td>{value.fileName}</td>
                  <td>{value.value ?? "-"}</td>
                  <td>{formatConfidence(value.confidence)}</td>
                  <td>{value.evidence ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function DraftReply({
  draftReply,
  onDraftChange,
}: {
  draftReply: string;
  onDraftChange: (value: string) => void;
}) {
  return (
    <section className="panel draft-panel">
      <h2>Draft Reply</h2>
      <textarea value={draftReply} onChange={(event) => onDraftChange(event.target.value)} />
      <button type="button" onClick={() => void navigator.clipboard?.writeText(draftReply)}>
        Copy Draft
      </button>
    </section>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatOutcome(outcome: string | null) {
  return outcome ? outcome.replaceAll("_", " ") : "-";
}

export default App;
