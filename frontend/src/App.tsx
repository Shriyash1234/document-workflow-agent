import { FormEvent, useEffect, useMemo, useState } from "react";
import { askQuery, getHealth, getInbox, getSamples, processInboxEmail, runSample, uploadDocument } from "./api";
import { LegacyPartOnePanel } from "./components/LegacyPartOnePanel";
import { OperatorWorkbench } from "./components/OperatorWorkbench";
import type { InboxEmail, QueryResult, SampleOutput, ShipmentVerification, StoredRun } from "./types";

function App() {
  const [health, setHealth] = useState("Checking");
  const [samples, setSamples] = useState<SampleOutput[]>([]);
  const [inbox, setInbox] = useState<InboxEmail[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [shipment, setShipment] = useState<ShipmentVerification | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [run, setRun] = useState<StoredRun | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [query, setQuery] = useState("show me everything pending review for customer Atlas Retail India");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getHealth(), getSamples(), getInbox()])
      .then(([healthResponse, sampleOutputs, inboxEmails]) => {
        const firstEmail = inboxEmails[0] ?? null;
        const firstShipment = firstEmail?.latestShipment ?? null;

        setHealth(healthResponse.geminiConfigured ? "Ready" : "Gemini key missing");
        setSamples(sampleOutputs);
        setInbox(inboxEmails);
        setSelectedEmailId(firstEmail?.emailId ?? null);
        setShipment(firstShipment);
        setDraftReply(firstShipment?.decision?.draftReply ?? "");
      })
      .catch((caught: Error) => {
        setHealth("Backend unavailable");
        setError(caught.message);
      });
  }, []);

  const selectedEmail = useMemo(
    () => inbox.find((email) => email.emailId === selectedEmailId) ?? inbox[0] ?? null,
    [inbox, selectedEmailId],
  );

  const visibleSamples = useMemo(
    () =>
      samples.filter((sample) =>
        ["clean/commercial-invoice.pdf", "messy/commercial-invoice-messy.pdf", "clean/bill-of-lading.pdf"].includes(
          sample.pdf,
        ),
      ),
    [samples],
  );

  async function runAction(label: string, action: () => Promise<void>, formatError?: (message: string) => string) {
    setBusy(label);
    setError(null);
    try {
      await action();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Something went wrong.";
      setError(formatError ? formatError(message) : message);
    } finally {
      setBusy(null);
    }
  }

  function handleSelectEmail(email: InboxEmail) {
    setSelectedEmailId(email.emailId);
    setShipment(email.latestShipment);
    setDraftReply(email.latestShipment?.decision?.draftReply ?? "");
  }

  async function handleProcessEmail(email: InboxEmail) {
    await runAction(
      `Processing ${email.attachments.length} documents. This may take 60-120 seconds.`,
      async () => {
        const processedShipment = await processInboxEmail(email.emailId);
        const refreshedInbox = await getInbox();

        setInbox(refreshedInbox);
        setSelectedEmailId(email.emailId);
        setShipment(processedShipment);
        setDraftReply(processedShipment.decision?.draftReply ?? "");
      },
      (message) => `Could not process ${email.subject}: ${message}`,
    );
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
          <p className="eyebrow">Nova CG Workbench</p>
          <h1>Email-to-verification workflow</h1>
        </div>
        <span className={`status-pill ${health === "Ready" ? "good" : "warn"}`}>{health}</span>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {busy && <div className="progress-banner">{busy}</div>}

      <OperatorWorkbench
        inbox={inbox}
        selectedEmail={selectedEmail}
        shipment={shipment}
        draftReply={draftReply}
        busy={Boolean(busy)}
        onSelectEmail={handleSelectEmail}
        onProcessEmail={handleProcessEmail}
        onDraftChange={setDraftReply}
      />

      <section className="insights-panel">
        <div className="section-heading">
          <p className="eyebrow">Stored Data Query</p>
          <h2>Insights</h2>
        </div>
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

      <LegacyPartOnePanel
        busy={Boolean(busy)}
        run={run}
        samples={visibleSamples}
        onRunSample={handleSample}
        onUpload={handleUpload}
      />
    </main>
  );
}

export default App;
