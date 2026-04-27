# Product Requirements Document

## 1. Nova Understanding

### What Is Nova?

Nova is GoComet's AI workflow layer for freight and trade operations. It is meant to handle messy operational work that does not fit neatly inside traditional SaaS screens: reading documents, checking customer-specific rules, deciding next actions, and keeping humans in control when the case is risky.

Traditional SaaS assumes users know what to enter, where to click, and which exception path to follow. Trade operations often starts with unstructured PDFs, emails, scans, and incomplete context. A normal SaaS form can store the final answer, but it cannot reliably understand the document, detect hidden mismatches, explain the risk, and route the case.

For this POC, Nova validates trade documents by extracting key fields, comparing them with configured customer rules, routing the shipment to approval/review/amendment, storing the outcome, and letting operators ask questions over past runs.

### What Is The FDE Model?

FDE means Forward Deployed Engineer. In this model, engineers work close to the customer's real workflow instead of building a generic product from far away. The engineer studies the operator's day, identifies where the work breaks, builds a focused workflow, and turns learnings into reusable product primitives.

GoComet uses this model for Nova because AI workflow automation is highly context-dependent. Two customers may both say "validate documents," but their rules, risk tolerance, document formats, and escalation paths can be very different. A forward-deployed approach lets GoComet solve the first workflow deeply, prove measurable outcomes, and then generalize the pattern.

In this POC, that means starting with one concrete customer rule set and one document-validation loop, instead of pretending every trade-doc workflow can be solved by a generic prompt.

### What Is A System Of Outcomes?

A System of Record stores facts after work happens. A System of Engagement helps users communicate and interact. A System of Outcomes actively moves work toward a measurable business result.

Nova should be a System of Outcomes because the goal is not just to store shipment documents or show a chat interface. The goal is to reduce document-review time, catch risky discrepancies, generate amendment requests, and increase safe auto-approval.

For this POC, the outcome is: a CG operator can upload or select a trade document and quickly know whether the shipment can proceed, needs review, or needs correction. The system keeps evidence, confidence, validation results, and decisions so the outcome is explainable rather than a black-box answer.

## 2. Problem Statement

### Current Flow Breakpoints

The current trade-document validation flow breaks in these places:

- Unstructured intake: documents arrive as PDFs, images, scans, or exports with inconsistent layouts.
- Manual field hunting: operators must locate consignee, HS code, ports, Incoterms, gross weight, and invoice number by eye.
- Rule memory: customer-specific expected values live in human memory, spreadsheets, SOPs, or previous emails.
- Hidden mismatch risk: small changes such as `Atlas Retail Imports Pvt Ltd` instead of `Atlas Retail India Pvt Ltd` can look harmless but matter operationally.
- Low-confidence ambiguity: missing Incoterms or unreadable weights are often treated inconsistently across operators.
- Slow amendment loop: when a supplier sends wrong data, the operator still has to draft a clear correction request.
- Weak auditability: after the decision, it is hard to answer why a shipment was approved, blocked, or amended.
- Reporting friction: managers cannot easily ask how many shipments were flagged, approved, or pending review without manual data work.

### Success In The First 5 Minutes

In the first five minutes, a CG operator should be able to:

1. Open the UI and see that the backend and model configuration are ready.
2. Run a clean sample document and see extracted fields with confidence and evidence.
3. See validation results against the customer rule set.
4. See a clear routing decision: `auto_approve`, `human_review`, or `draft_amendment`.
5. Run a messy document and immediately understand which fields failed and why.
6. Ask a stored-data question such as "how many shipments were flagged this week?" and see an answer grounded in SQLite rows.

Success means the operator trusts the workflow enough to use it as a first-pass review assistant, not as an unverified autopilot.

## 3. Users And Jobs To Be Done

### Persona 1: CG Operator

CG is the customer-governance or operations-review user. This user is responsible for validating shipment documents, catching discrepancies, deciding whether the shipment can proceed, and coordinating corrections.

Needs:

- fast document review
- reliable exception detection
- clear reasoning for every hold or amendment
- an audit trail for approvals and rejected documents

Pain points:

- repetitive manual reading
- inconsistent interpretation of customer rules
- slow supplier correction cycles
- poor visibility into recurring document issues

### Persona 2: SU Supplier User

SU is the supplier or shipper-side user submitting documents. This user wants documents accepted quickly and wants correction requests to be specific when something is wrong.

Needs:

- quick feedback on submitted documents
- clear explanation of rejected or missing fields
- fewer repeated clarification cycles
- confidence that corrected documents will be reviewed consistently

Pain points:

- vague amendment requests
- shipment delays caused by small document mismatches
- unclear customer-specific expectations
- repeated resubmission work

### Jobs To Be Done

1. When a shipment document arrives, I want Nova to extract the required trade fields, so that I do not spend time manually reading every line.
2. When extracted fields are available, I want Nova to validate them against customer-specific rules, so that risky discrepancies are surfaced before shipment processing.
3. When a required field is missing or low-confidence, I want Nova to mark it as uncertain, so that the shipment is not silently approved.
4. When a critical field mismatches the customer rule, I want Nova to draft an amendment request, so that I can ask the supplier for corrections quickly.
5. When a shipment is clean, I want Nova to auto-approve it with evidence, so that operators can focus on true exceptions.
6. When I review a past shipment, I want to see the extracted value, expected value, confidence, and reason, so that I can audit the decision.
7. When a manager asks for recent workflow status, I want to ask a natural-language question over stored runs, so that I can answer without manually querying the database.

## 4. Agent Architecture

### Why Three Core Agents?

The POC uses three core workflow agents because the business process has three separate questions:

- Extractor Agent: What does the document say?
- Validator Agent: Does it match the customer's rules?
- Router Agent: What should the team do next?

One prompt would blur reading, validation, and action into a single black-box response. That would be harder to debug, harder to test, and harder to defend when an operator asks why a shipment was blocked.

Five or more agents would add overhead before the workflow needs it. For this POC, splitting by document type, evidence review, supplier messaging, and escalation could be useful later, but the current scope only needs extraction, validation, and routing.

### Agent Responsibilities

| Agent | Framing | Responsibility | Input | Output |
| --- | --- | --- | --- | --- |
| Extractor Agent | Planner for document facts | Read PDF/image and normalize required fields | File path, MIME type, extraction schema | Structured JSON with document type, fields, confidence, evidence |
| Validator Agent | Verifier for business rules | Compare extracted values with customer rules | Extraction JSON, customer rules | Validation summary with `match`, `mismatch`, `uncertain`, found, expected, reason |
| Router Agent | Executor for next action | Decide operational outcome | Validation summary, critical-field policy | Decision JSON with outcome, reasoning, discrepancies, amendment draft |
| Query Agent | Reporting assistant | Convert operator questions into safe SQL and summarize rows | User question, schema dictionary | SQL, params, row result, grounded answer |

The Query Agent is separate from the three core pipeline agents. It does not decide shipment outcomes. It only helps users inspect stored workflow data.

### Agent Handoff

Agents communicate through structured handoffs, not shared hidden memory.

Handoff sequence:

1. API creates a `run` record.
2. API stores document metadata.
3. Extractor returns `ExtractionResult`.
4. Validator receives `ExtractionResult` plus customer rules and returns `ValidationSummary`.
5. Router receives `ValidationSummary` plus customer rules and returns `DecisionResult`.
6. Repository stores raw JSON and normalized rows in SQLite.
7. UI renders the stored run object returned by the API.

This makes each stage inspectable. If the router makes a surprising decision, we can inspect the exact validation summary it received instead of guessing what a prompt remembered.

### Crash Survival

State survives a crash through SQLite checkpoints.

Current POC behavior:

- A run is created with `processing` status before model work begins.
- Document metadata is stored before extraction starts.
- Extraction, validation, and decision outputs are saved after each stage completes.
- If the pipeline throws, the run is marked `failed` with an error message.

Production upgrade:

- Add a `pipeline_steps` table with step-level status, started_at, completed_at, retry_count, and error_message.
- Make each step idempotent so the worker can resume from the last completed stage.
- Move execution to a queue-backed worker or workflow engine.
- Add dead-letter handling for files that repeatedly fail extraction.

## 5. LLM And Tooling Choices

### LLM Choices By Agent

| Agent | Model Choice | Why | Tradeoff |
| --- | --- | --- | --- |
| Extractor Agent | Gemini vision/document model | Good fit for PDFs/images and structured extraction | Highest latency and cost in the pipeline |
| Validator Agent | No LLM | Rules must be deterministic, testable, and auditable | Less flexible, but much safer for policy |
| Router Agent | No LLM in POC | Approval policy should be explicit and explainable | Amendment text is templated, not creative |
| Query Agent | Gemini text model | Useful for SQL planning and concise row summaries | Requires strict SQL validation before execution |

### Vision Fallback For Bad Documents

Fallback strategy when document quality is poor:

1. Return `uncertain` for missing or low-confidence fields.
2. Block auto-approval when critical fields are uncertain.
3. Ask for human review or corrected upload instead of guessing.
4. In production, add OCR pre-processing, image enhancement, page splitting, and a second extraction attempt with a cheaper or stronger model depending on failure type.

The worst behavior would be hallucinating a clean value because the document is hard to read.

### Orchestration Choice

The POC uses custom orchestration in `runDocumentPipeline` because the workflow is short, linear, and easier to explain in code.

Why custom for Part 1:

- fewer dependencies
- easier reviewer setup
- explicit step order
- enough for a single document pipeline

Production mapping:

- LangGraph would be a good next step when branching, retries, human review, and multi-agent state become more complex.
- Temporal or a queue-backed worker would be useful if execution must survive process restarts and long-running model calls at scale.

### Structured Output, Tool Use, And Avoidance

Structured output is used where model output becomes system state:

- Extractor Agent asks Gemini for strict JSON.
- Zod validates extracted fields, confidence, and evidence.
- Query Agent asks for structured SQL plan JSON.
- Backend validates SQL before execution.

Tool use is simulated through backend-controlled execution:

- the model proposes SQL
- the backend validates and executes it
- the model summarizes only returned rows

LLMs are avoided for deterministic policy:

- customer validation rules
- critical-field routing
- approval thresholds
- SQL safety checks

## 6. Trust, Failure Handling, And Evals

### Preventing Hallucinated Fields

Nova reduces hallucination risk by requiring every extracted field to include:

- `value`
- `confidence`
- `evidence`

If the value is not visible, the expected output is `null`, not a guessed value. The validator treats missing values and low-confidence values as `uncertain`. The router prevents silent approval when uncertainty affects critical fields.

In production, I would also show evidence snippets next to the source document preview so the operator can verify the extraction visually.

### Low-Confidence Handling

The rule is simple: low confidence cannot auto-approve.

For this POC:

- confidence below `0.75` becomes `uncertain`
- missing fields become `uncertain`
- critical uncertain fields route to `draft_amendment`
- non-critical uncertain fields route to `human_review`

This creates a conservative workflow: the system reduces manual work on clean cases but escalates ambiguity.

### Cost And Retry Controls

Controls for runaway cost:

- one extraction attempt per uploaded document in the POC
- bounded model token output through structured schemas
- deterministic validation and routing after extraction
- query SQL is read-only and limited to small result sets
- no autonomous loops or recursive agent calls

Production controls:

- max retry count per stage
- exponential backoff for transient model failures
- per-customer budget limits
- model timeout and file-size limits
- circuit breaker when provider errors spike

### Offline Eval

Offline eval I would actually run:

- Build a labeled fixture set of clean, messy, and low-quality trade documents.
- For each document, store expected values for consignee, HS code, ports, Incoterms, description, gross weight, and invoice number.
- Run extraction and validation in CI or nightly eval.
- Measure field-level exact match, field-level false positive rate, uncertainty accuracy, and final routing accuracy.

Minimum acceptance for the POC fixture set:

- 95 percent validation correctness on deterministic fixtures.
- 90 percent routing correctness across clean, messy, and uncertain cases.
- Zero auto-approvals when a critical field is missing, low-confidence, or mismatched.

### Online Metric

Online metric I would actually run:

`critical_escape_rate = critical mismatches missed by Nova / total critical mismatches found after human review`

This matters because the biggest product risk is not that Nova asks for too much review. The biggest risk is that it approves something it should have stopped.

## 7. Metrics And Success Criteria

### North-Star Metric

North-star metric: percentage of document submissions that reach a correct operational decision within 5 minutes.

This captures both speed and decision quality.

### Supporting Metrics

- Field extraction accuracy by required field.
- Critical-field false negative rate.
- Auto-approval precision.
- Human-review rate.
- Amendment-draft acceptance rate by CG operators.
- Average time from upload to routing decision.
- Model extraction failure rate.
- Cost per processed document.

### 2-Week Pilot Go / No-Go Criteria

Go criteria:

- At least 90 percent of pilot documents receive a completed routing decision.
- Zero known critical mismatches are auto-approved.
- At least 70 percent of clean documents are auto-approved without manual correction.
- Average decision time is under 5 minutes per document.
- CG operators rate decision explanations as useful in at least 80 percent of reviewed cases.

No-go criteria:

- Any repeated critical-field escape that auto-approves a wrong document.
- More than 20 percent extraction failure on normal-quality customer documents.
- Average decision time is slower than the current manual workflow.
- Operators cannot understand why the system made a routing decision.
- Query answers are not grounded in stored run data.

## 8. What Is Next After Part 1?

If I had two more weeks, I would build the next layer that improves reliability before expanding scope.

Priority 1: Evaluation harness

Why:
The system should not grow until extraction and routing quality can be measured repeatedly.

What:
Add labeled fixtures, eval scripts, per-field accuracy reports, and regression thresholds.

Priority 2: Step-level persistence and retries

Why:
Crash recovery and model failure handling are essential before real pilot usage.

What:
Add `pipeline_steps`, retry counts, idempotent stage execution, and failed-step replay.

Priority 3: Evidence-first review UI

Why:
Operators need to trust and correct the system quickly.

What:
Show extracted evidence next to validation results, add reviewer actions, and capture whether CG accepted or corrected the recommendation.

Priority 4: Multi-customer rule configuration

Why:
Nova becomes more valuable when the same workflow can support different customer policies without code changes.

What:
Move customer rules into editable database-backed configuration with versioning.

## Final Acceptance For Part 1

The Part 1 POC is complete when:

- a PDF or image can be processed end-to-end
- extracted fields include confidence and evidence
- validation results are deterministic and auditable
- routing produces approve, review, or amendment decisions
- all outputs are stored in SQLite
- query answers come from stored rows
- the UI shows clean and messy flows clearly
- README, PRD, technical write-up, and demo script are ready for review
