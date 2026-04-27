# Product Requirements Document

## Product

Nova is an AI-assisted trade-operations workflow for document-heavy exception handling. It is not just a field extraction tool. The product outcome is faster, safer movement of shipments by turning raw documents into structured decisions, human review queues, and traceable actions.

In this POC, Nova focuses on one narrow but representative job: reading trade documents, validating them against customer expectations, routing exceptions, and letting operators query what happened.

## Why This Matters

Traditional SaaS works well when inputs are already structured and the workflow is predictable. Trade operations is the opposite:

- Inputs arrive as PDFs, scans, screenshots, and email attachments.
- Required fields are buried in semi-structured layouts.
- The same document type varies across shippers and geographies.
- Critical downstream actions depend on both document content and customer-specific rules.
- Teams need an audit trail for every exception, not just a model answer.

This is where a forward-deployed engineering approach makes sense. The workflow cannot be solved by a generic dashboard alone. It needs product logic, workflow design, customer-specific configuration, and AI behavior tuned around one operations loop.

## What FDE Means Here

Forward-deployed engineering means building close to the real workflow instead of abstracting too early.

For Nova, that means:

- Start with one customer scenario and one concrete document flow.
- Encode customer-specific rules directly into the workflow.
- Treat human review as part of the product, not a fallback afterthought.
- Instrument outcomes so the system becomes more trustworthy over time.
- Use AI where the problem is unstructured, and deterministic logic where the business needs auditability.

The point is not to ship a generic platform first. The point is to land an outcome for a real operator, then generalize carefully.

## System Of Outcomes

Nova should improve the workflow at four levels:

1. Document understanding:
Convert messy files into structured fields with confidence and evidence.

2. Decision support:
Compare extracted facts against customer rules and explain mismatches.

3. Operational routing:
Decide whether a shipment can move forward automatically, needs review, or needs correction.

4. Organizational learning:
Store every run so teams can measure error patterns, throughput, and intervention rate.

## Problem Statement

Today, trade-ops teams spend too much time manually reading shipment documents, comparing them against expected customer terms, spotting discrepancies, and deciding whether to approve or hold the shipment. This work is repetitive but high-risk. Missing one HS code mismatch or wrong consignee can create operational delay, compliance issues, and customer frustration.

The opportunity is to reduce manual toil without hiding risk. Nova should automate the structured parts of the workflow while preserving human control over ambiguous or high-impact cases.

## Users

### CG Persona

CG is the customer-governance or operations-review user responsible for compliance, exceptions, and final approval on risky shipments.

Goals:

- Prevent non-compliant or mismatched documents from moving forward.
- Review only the cases that truly need human judgment.
- Understand why the system flagged a shipment.
- Send a clear amendment request when documents are wrong.

Pain points:

- Too many documents to inspect manually.
- Weak tooling for tracing why a shipment was blocked.
- Hard to audit past decisions and recurring failure patterns.

### SU Persona

SU is the shipper-side user submitting documents and wanting the shipment to move quickly.

Goals:

- Upload documents once and get quick feedback.
- Avoid repeated back-and-forth on missing fields.
- Understand exactly what needs correction when a document is rejected.

Pain points:

- Slow turnaround on document review.
- Vague requests for resubmission.
- Rework caused by inconsistent expectations across customers.

## Jobs To Be Done

1. When a shipment document is received, CG wants the system to extract the key trade fields so manual reading time drops.
2. When extracted data is available, CG wants it checked against customer-specific rules so risky discrepancies surface immediately.
3. When only low-risk ambiguity exists, CG wants the system to hold the document for review rather than silently approve it.
4. When a critical mismatch exists, CG wants a draft amendment request so the team can respond quickly and consistently.
5. When leadership asks what happened over recent runs, CG wants to query stored outcomes in natural language without manually inspecting each record.

## Scope For This POC

In scope:

- PDF and image document intake
- Structured extraction with confidence and evidence
- Deterministic validation against one synthetic customer rule set
- Deterministic routing for approve, review, or amendment
- Local SQLite persistence
- Natural-language querying over stored run data
- Minimal UI for demoing the full flow

Out of scope:

- Multi-tenant customer management
- Authentication and access control
- Production-grade deployment and scaling
- OCR fallback vendors or model routing
- Part 2 multi-agent expansion

## User Experience Flow

1. Operator chooses a sample or uploads a document.
2. Nova extracts required fields from the file.
3. Nova validates fields against customer rules.
4. Nova routes the run to one of three outcomes:
   `auto_approve`, `human_review`, or `draft_amendment`
5. The UI shows extracted fields, evidence, validation results, and decision reasoning.
6. The run is stored in SQLite for later audit and query.
7. Operator can ask natural-language questions over historical runs.

## Solution Design

The workflow is intentionally split into clear responsibility boundaries:

- Extractor Agent:
Uses Gemini to read unstructured PDFs/images and return strict JSON.

- Validator Agent:
Applies deterministic customer rules to each field and labels it `match`, `mismatch`, or `uncertain`.

- Router Agent:
Uses validation output and critical-field policy to decide the next action.

- Query Agent:
Translates operator questions into safe read-only SQL and answers from returned rows only.

This split mirrors the actual business questions:

- What did the document say?
- Is it acceptable?
- What should happen next?

## Why Not One Prompt?

One prompt could produce extraction plus decision text, but it would blur responsibilities and weaken auditability.

Problems with a single-prompt design:

- Harder to debug whether the failure came from reading or reasoning.
- Harder to explain why a shipment was blocked.
- Harder to test rule behavior independently from model quality.
- Harder to preserve deterministic business policy.

## Why Not More Agents?

More agents would only help once the workflow grows beyond the current scope. For this POC, extra agents would mostly add orchestration overhead.

Three core agents are the smallest set that preserves:

- separation of concerns
- deterministic policy enforcement
- reviewer-friendly reasoning
- future extensibility

## LLM And Tooling Choices

Frontend:
React + Vite for a fast demo UI.

Backend:
Node.js + TypeScript + Express for rapid iteration and explicit control.

Database:
SQLite for low-friction local persistence during a POC.

Model:
Gemini for multimodal document understanding and structured JSON generation.

Orchestration:
Custom orchestration for the POC because the workflow is linear and bounded. In production, the same stages could map cleanly to LangGraph or a similar workflow engine for retries, branching, and observability.

## Trust, Failure Handling, And Human Control

Nova should never present itself as an all-knowing autopilot.

Trust mechanisms in the POC:

- every extracted field includes confidence and evidence
- low-confidence or missing fields become `uncertain`
- critical issues cannot auto-approve
- stored outputs make the workflow auditable
- query answers are grounded in database rows rather than free-form generation

Human review is a feature, not a defect. The system is designed to narrow the review surface, not eliminate it blindly.

## Evaluation Strategy

The POC should be evaluated on:

- extraction completeness across the required fields
- extraction confidence quality on clean vs messy documents
- validation correctness on known mismatches
- routing correctness for approve, review, and amendment paths
- answer grounding for natural-language queries
- operator clarity in the UI

## Success Metrics

Primary metrics:

- auto-approval rate on clean documents
- exception-detection rate on intentionally messy documents
- average operator review time per document
- percentage of flagged runs with clear reason visibility
- query answer usefulness for operational reporting

Secondary metrics:

- extraction confidence distribution by field
- top recurring mismatch categories
- percentage of uploads resulting in human review

## Risks

- model extraction quality may vary across noisy scans
- a single customer rule set can hide generalization complexity
- local SQLite is fine for a demo but not for concurrent production workloads
- natural-language SQL planning still needs strict backend guards

## Next Two Weeks

Week 1:

- add stronger eval fixtures across more document variants
- introduce document-type-specific prompts
- improve UI clarity for evidence and discrepancy review
- add richer observability around latency and failure reasons

Week 2:

- add multi-customer rule management
- move storage to Postgres
- add background job execution and retry handling
- introduce reviewer actions such as approve, reject, and resend request
- prepare production orchestration mapping with LangGraph or Temporal-style workflow control

## Summary

Nova is best understood as an outcome system for trade-document operations. The value is not only extraction. The value is that unstructured documents become structured decisions with evidence, policy checks, exception routing, and a durable audit trail.
