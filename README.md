# Agentic Workflow

Working POC for trade-document extraction, validation, routing, storage, natural-language query, and a Part 2 CG email-to-verification workflow.

The app uses a simulated supplier inbox: a CG operator processes an email with multiple trade-document attachments, each document runs through the existing agent pipeline, the backend cross-checks fields across documents, and the UI shows the verification result plus an editable draft reply. The system never sends an email automatically.

## Project Structure

```txt
agentic-workflow/
  backend/   Node.js + TypeScript + Express API, agents, SQLite, scripts, tests
  frontend/  React + Vite UI for CG verification and Part 1 document runs
  samples/   Synthetic clean/messy documents and simulated inbox fixtures
  docs/      PRD and technical write-up deliverables
```

## Requirements

- Node.js 22+
- npm
- Gemini API key

## Setup

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create the backend environment file:

```bash
cd ../backend
copy .env.example .env
```

Set `GEMINI_API_KEY` in `backend/.env`.

Example:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_FALLBACK_MODEL=gemini-3-flash-preview
PORT=4000
DATABASE_PATH=./data/agentic-workflow.db
```

Do not commit `.env`.

## Run Locally

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

Backend:

```txt
http://localhost:4000
```

SQLite is initialized automatically at:

```txt
backend/data/agentic-workflow.db
```

## Demo Flow

Part 2 workflow:

1. Open the UI at `http://localhost:5173`.
2. In `Incoming SU Emails`, process `clean-shipment`.
3. Confirm the top summary shows an approved shipment decision.
4. Review document-level results and cross-document checks.
5. Review the editable approval draft.
6. Process `messy-shipment`.
7. Click a mismatched or uncertain cross-document field.
8. Review evidence in `Discrepancy Detail`.
9. Review the editable amendment or review draft.
10. Ask: `show me everything pending review for customer Atlas Retail India`.

Part 1 controls are still available under `Part 1 single-document pipeline`.

## Backend API

Core endpoints:

```txt
GET  /api/health
GET  /api/samples
GET  /api/rules/customer
POST /api/runs
POST /api/runs/sample
GET  /api/runs/:id
POST /api/query
```

Part 2 endpoints:

```txt
GET  /api/inbox
POST /api/inbox/:emailId/process
GET  /api/shipments/:id
```

Run a single sample document:

```bash
curl -X POST http://localhost:4000/api/runs/sample \
  -H "Content-Type: application/json" \
  -d "{\"samplePath\":\"clean/commercial-invoice.pdf\"}"
```

Process a simulated supplier email:

```bash
curl -X POST http://localhost:4000/api/inbox/clean-shipment/process
```

Ask a grounded question:

```bash
curl -X POST http://localhost:4000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"how many shipment emails need amendment?\"}"
```

## Useful Commands

Backend:

```bash
cd backend
npm run extract:sample -- ../samples/clean/commercial-invoice.pdf
npm run validate:fixture
npm run validate:fixture -- messy
npm run route:fixture
npm run route:fixture -- messy
npm run inbox:sample
npm test
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

`npm run inbox:sample` processes both simulated inbox emails. It calls Gemini, so it requires a valid `GEMINI_API_KEY`.

## Sample Data

Clean samples:

```txt
samples/clean/commercial-invoice.pdf
samples/clean/packing-list.pdf
samples/clean/bill-of-lading.pdf
```

Messy samples:

```txt
samples/messy/commercial-invoice-messy.pdf
samples/messy/packing-list-messy.pdf
samples/messy/bill-of-lading-messy.pdf
```

Simulated inbox:

```txt
samples/inbox/emails.json
```

Clean documents are designed to mostly pass validation. Messy documents intentionally include issues such as mismatched consignee, HS code, Incoterms, and gross weight.

## Architecture

```txt
Simulated SU email
  -> attachment list
  -> Extractor Agent per document
  -> Validator Agent per document
  -> Router Agent per document
  -> CrossDocumentValidator across invoice/BOL/packing list
  -> shipment-level decision and draft reply
  -> SQLite storage
  -> React CG workflow UI and Query Agent
```

LLM usage:

- Gemini vision is used for document extraction.
- Structured JSON output is used for extraction and SQL planning.
- Validation, routing, cross-document checks, and draft templates are deterministic.
- Query SQL is validated as read-only before execution.

## Example Query Questions

```txt
how many shipment emails need amendment?
show latest shipment verification results
which cross-document fields mismatched?
show me everything pending review for customer Atlas Retail India
how many documents were processed?
show approved shipments
show mismatches for invoice INV-2026-0418
```

## Tests

Current deterministic coverage includes:

- Validator clean and messy cases
- Router approve/review/amendment decisions
- Cross-document match/mismatch/uncertain checks
- Shipment-level decision and draft generation
- Query SQL safety
- Simulated inbox fixture loading

Run:

```bash
cd backend
npm test
```

## Deliverables

- [docs/PART2_PRD.md](docs/PART2_PRD.md)
- [docs/PRD.md](docs/PRD.md)
- [docs/TECHNICAL_WRITEUP.md](docs/TECHNICAL_WRITEUP.md)
- Working backend and frontend POC

## Known Limitations

- Inbox is simulated with local fixtures, not Gmail or Outlook.
- Email replies are drafts only; there is no send endpoint.
- SQLite is used for the assignment POC. Postgres would be preferred for multi-customer production deployment.
- Extraction quality depends on Gemini response quality and document readability.
- Cross-document validation is deterministic and intentionally conservative: uncertainty routes to human review instead of silent approval.
