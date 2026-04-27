# Submission Guide

This document is the reviewer-facing guide for the agentic workflow POC. It explains the deliverables, the demo path, and the reasoning behind the architecture.

## Assignment Mapping

Part 1 asks for a working POC that turns a document-heavy workflow into a governed AI-assisted workflow.

Implemented deliverables:

- Document intake through sample runs and file uploads.
- Extractor Agent that uses Gemini vision/document understanding to return structured fields, confidence scores, and evidence.
- Validator Agent that compares extracted fields against customer-specific rules.
- Router Agent that decides whether the run can be auto-approved, needs human review, or should produce an amendment draft.
- SQLite storage for runs, documents, extracted fields, validation results, decisions, and query history.
- Natural-language query endpoint over stored workflow data.
- React + Vite UI to run samples, upload documents, inspect results, and ask grounded questions.

## Run Locally

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create backend environment:

```bash
cd ../backend
copy .env.example .env
```

Set `GEMINI_API_KEY` in `backend/.env`.

Start the backend from the repo root:

```bash
npm run dev:backend
```

Start the frontend from the repo root in another terminal:

```bash
npm run dev:frontend
```

Open:

```txt
http://localhost:5173
```

## Demo Script

Use this order for a clean walkthrough:

1. Start backend and frontend.
2. Open the UI and confirm backend health shows as connected.
3. Run `clean/commercial-invoice.pdf`.
4. Show extracted fields, evidence, validation matches, and auto-approval.
5. Run `messy/commercial-invoice-messy.pdf`.
6. Show mismatches or uncertain fields and the router decision.
7. Upload a local PDF or image using the upload panel.
8. Ask a question such as:

```txt
how many shipments were flagged this week?
```

9. Show that the query response includes the generated SQL and returned rows, so the answer is auditable.

## API Smoke Tests

Health:

```bash
curl http://localhost:4000/api/health
```

Run a sample:

```bash
curl -X POST http://localhost:4000/api/runs/sample \
  -H "Content-Type: application/json" \
  -d "{\"samplePath\":\"clean/commercial-invoice.pdf\"}"
```

Upload a document:

```bash
curl -X POST http://localhost:4000/api/runs \
  -F "document=@../samples/clean/commercial-invoice.pdf"
```

Ask a grounded query:

```bash
curl -X POST http://localhost:4000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"how many shipments were flagged this week?\"}"
```

## Architecture

The pipeline is intentionally split into bounded agents:

```txt
Document
  -> Extractor Agent
  -> Validator Agent
  -> Router Agent
  -> SQLite
  -> Query Agent
```

The Extractor Agent is LLM-powered because the input is unstructured and visual. It needs to read PDFs/images and normalize fields into a predictable schema.

The Validator Agent is deterministic because customer compliance rules should be predictable, testable, and auditable. It is still an agent in the workflow sense: it owns one responsibility and emits a structured result.

The Router Agent is deterministic in this POC because the decision boundary should be explainable. It uses validation results and customer critical-field rules to choose `auto_approve`, `human_review`, or `draft_amendment`.

The Query Agent uses the LLM only to plan safe read-only SQL and summarize returned rows. The backend validates the SQL before execution and answers only from stored data.

## Why Three Core Agents?

Three agents create clean responsibility boundaries:

- Extraction answers: "What does the document say?"
- Validation answers: "Does it match the customer's rules?"
- Routing answers: "What should the operation team do next?"

One large prompt would hide these boundaries, making failures harder to debug and decisions harder to audit. Five or more agents would add coordination overhead without adding much value for this POC. The chosen split follows the business process itself and keeps each output reviewable.

## Safety And Governance

Important safeguards:

- Structured JSON responses are requested from Gemini.
- Zod validates model outputs before the backend trusts them.
- Validation rules are explicit in `backend/data/customer-rules.json`.
- SQL queries must be single-statement read-only `SELECT` queries.
- SQL table access is allowlisted.
- Uploaded files are stored locally under `backend/uploads/`, which is ignored by git.
- The SQLite database is local and ignored by git.

## Known Limits

This is a POC, not a production deployment.

- Authentication and tenant-level permissions are not implemented.
- The sample rule set covers one synthetic customer scenario.
- Uploaded files are stored locally instead of object storage.
- The database is SQLite for simplicity; Postgres would be the production upgrade path.
- The UI is intentionally minimal and focused on proving the workflow.

## Suggested Reviewer Narrative

The important point is not just that the app extracts document fields. The stronger story is that it turns extraction into an auditable operations workflow: the system preserves evidence, validates against explicit customer rules, routes exceptions, stores every result, and lets an operator query past runs using grounded data.
