# Agentic Workflow

Agentic workflow POC for document extraction, validation, routing, storage, and query.

This project is being built for a full-stack AI engineering assignment. The core idea is to turn a messy document-heavy business process into a governed, human-reviewable agent workflow.

## Project Structure

```txt
agentic-workflow/
  backend/   Node.js API, agents, SQLite storage, and pipeline orchestration
  frontend/  React + Vite UI for running and reviewing document pipelines
  samples/   Synthetic clean and messy trade documents used for demos
```

## Sample Documents

The repository already includes synthetic trade documents for testing the pipeline.

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

The clean documents are designed to pass validation. The messy documents include intentional issues such as missing Incoterms, mismatched HS code, changed consignee name, and inconsistent gross weight.

## Planned Stack

```txt
Frontend: React + Vite
Backend: Node.js + TypeScript + Express
Database: SQLite
LLM: Gemini vision model
```

## Planned Workflow

```txt
Upload document
  -> Extractor Agent extracts structured fields with confidence scores
  -> Validator Agent checks fields against customer rules
  -> Router Agent decides approve, human review, or amendment draft
  -> SQLite stores the run and results
  -> Query layer answers basic questions from stored data
```

## Backend

Install backend dependencies:

```bash
cd backend
npm install
```

Create backend environment file:

```bash
copy .env.example .env
```

Then set:

```env
GEMINI_API_KEY=your_key_here
```

Run the backend from the repo root:

```bash
npm run dev:backend
```

Backend URL:

```txt
http://localhost:4000
```

Available endpoints:

```txt
GET /api/health
GET /api/samples
GET /api/rules/customer
POST /api/runs/sample
GET /api/runs/:id
POST /api/query
```

The backend initializes SQLite automatically on startup. By default the database is created at:

```txt
backend/data/agentic-workflow.db
```

Run the Extractor Agent against a sample document:

```bash
cd backend
npm run extract:sample -- ../samples/clean/commercial-invoice.pdf
```

Run the Validator Agent against deterministic fixtures:

```bash
cd backend
npm run validate:fixture
npm run validate:fixture -- messy
```

Run the Router Agent against deterministic fixtures:

```bash
cd backend
npm run route:fixture
npm run route:fixture -- messy
```

Run a real sample document through the full backend pipeline:

```bash
curl -X POST http://localhost:4000/api/runs/sample \
  -H "Content-Type: application/json" \
  -d "{\"samplePath\":\"clean/commercial-invoice.pdf\"}"
```

Ask a grounded question over stored runs:

```bash
curl -X POST http://localhost:4000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"question\":\"how many shipments were flagged this week?\"}"
```

The query layer uses Gemini to generate read-only SQLite `SELECT` statements from a schema dictionary. The backend validates that SQL is single-statement and read-only before execution, then Gemini summarizes only from returned rows.

## Current Status

Done:

- Project folders created
- Synthetic clean and messy sample documents created
- Backend skeleton created with health and sample-list endpoints
- SQLite storage initializes automatically on backend startup
- Customer validation rules added for the synthetic Atlas Retail shipment
- Extractor Agent added for Gemini-based PDF/image field extraction
- Validator Agent added for deterministic field-by-field rule checks
- Router Agent added for approve/review/amendment decisions
- Sample pipeline endpoint added for Extractor -> Validator -> Router -> SQLite runs
- Query Agent added for grounded natural-language questions over SQLite
- Frontend folder reserved

Next:

- Build the React + Vite UI

## Environment

The backend uses `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_FALLBACK_MODEL=gemini-2.5-flash
PORT=4000
DATABASE_PATH=./data/agentic-workflow.db
```

Do not commit `.env`.
