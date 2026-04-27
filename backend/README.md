# Backend

Node.js + TypeScript backend for the Nova trade document POC.

Planned responsibilities:

- expose API endpoints for health, samples, runs, and stored-data queries
- call Gemini for document extraction
- validate extracted fields against customer rules
- route each run to approve, human review, or amendment draft
- store runs, extracted fields, validation results, and decisions in SQLite

## Run

From the repo root:

```bash
npm run dev:backend
```

Health check:

```txt
GET http://localhost:4000/api/health
```

Sample manifest:

```txt
GET http://localhost:4000/api/samples
```
