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
```

## Current Status

Done:

- Project folders created
- Synthetic clean and messy sample documents created
- Backend skeleton created with health and sample-list endpoints
- Frontend folder reserved

Next:

- Add SQLite storage
- Add customer validation rules
- Implement Extractor, Validator, Router, and Query agents
- Build the React + Vite UI

## Environment

The backend will need a `.env` file once implementation begins:

```env
GEMINI_API_KEY=your_key_here
PORT=4000
DATABASE_PATH=./data/agentic-workflow.db
```

Do not commit `.env`.
