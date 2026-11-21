# API reference

Two route handlers. Both are `POST` with JSON bodies. Neither stores or logs content: logs hold only route, status, latency and token counts.

## `POST /api/extract`

Turns a story into verified facts.

**Request**

```json
{ "story": "Maine 2 November ko PhonePe se ... ₹12,000 bheje the ...", "today": "2026-11-20" }
```

- `story`: 20–2,000 characters after trimming.
- `today`: the client's local date, `YYYY-MM-DD`, within ±1 day of the server's date.

**200 response**

```json
{
  "facts": {
    "issueSummary": { "value": "A UPI payment of Rs 12,000 ... not received.", "evidence": null, "estimated": false },
    "entityType": { "value": "bank", "evidence": "Mere Bharat National Bank account se paise kat gaye", "estimated": false },
    "amountInr": { "value": 12000, "evidence": "₹12,000", "estimated": false },
    "txnDate": { "value": "2026-11-02", "evidence": "2 November", "estimated": false },
    "complaintDate": null
  },
  "dropped": 0,
  "usage": { "inputTokens": 2832, "outputTokens": 537 }
}
```

- Every one of the 15 fact keys is present; each is `{ value, evidence, estimated }` or `null`.
- `evidence` is the exact span of the story the value came from (only `issueSummary` has `null`, because it's a summary).
- `estimated: true` means a relative date ("3 weeks ago", "kal") was resolved against `today`.
- `dropped` counts facts removed because their evidence wasn't found in the story or their value was invalid.

Fact keys: `issueSummary, entityName, entityType, txnType, problem, amountInr, txnDate, complainedToEntity, complaintMode, complaintDate, entityResponse, entityResponseDate, reversed, reversedDate, accountType`. Enums are in [`lib/schema.ts`](../lib/schema.ts).

**Errors** (`{ "error": CODE }`)

| Status | Code | When |
|---|---|---|
| 400 | `TOO_SHORT` / `TOO_LONG` / `BAD_DATE` | Validation failed |
| 429 | `RATE_LIMITED` | More than `RATE_LIMIT_PER_HOUR` (10) per IP per hour; includes `Retry-After` |
| 502 | `MODEL_FAILED` | After the SDK's retries plus one schema retry |
| 422 | `MODEL_REFUSED` | Refused even after the server-side fallback |
| 503 | `PAUSED` | `DEMO_MODE=true` or no API key |

## `POST /api/draft`

Streams a complaint for one step of the plan.

**Request**

```json
{ "facts": { "...": "plain Facts, all 15 keys, null if unknown" }, "stepId": "bank_complaint", "language": "en", "today": "2026-11-20" }
```

- `facts` are the user-confirmed plain values (validated with `FactsSchema`). There is no free-text story.
- The server re-runs `planCase(facts, today)` and uses the step `stepId` from that plan. The figures and rule texts the model receives come from the engine, not from the client.
- `language`: `en` or `hi` (Hindi text; section labels stay in English).
- `today` may be in the past (samples are planned as of a fixed date) but not more than a day in the future.

**200 response**: `text/plain` stream:

```
SUBJECT: ...
DESCRIPTION:
...
RELIEF SOUGHT:
1. ...
DOCUMENTS TO ATTACH:
- ...
```

The client splits this into copyable fields (`splitDraft` in [`lib/draft.ts`](../lib/draft.ts)). If the model fails or refuses mid-stream, the stream ends with `[[HAQ_DRAFT_FAILED]]` and the client shows its static template.

**Errors:** `400 BAD_REQUEST / BAD_DATE / BAD_STEP`, `429 RATE_LIMITED` (2× the extraction limit), `503 PAUSED`.

## Client-only: `planCase(facts, today) → Plan`

Not an endpoint. It lives in [`lib/rules/index.ts`](../lib/rules/index.ts) and runs in the browser, so every edit re-plans instantly. The same function runs in unit tests, evals and `/api/draft`.

```ts
type Plan = {
  track: "BANKING" | "CONSUMER" | "INSURANCE" | "UNSUPPORTED";
  today: string; rulesVersion: string;
  steps: Step[];            // { id, title, status, detail, where?, url?, unlocksOn?, deadline?, projected?, dates?, ruleId, moreRuleIds? }
  currentStepId: string | null;
  banners: Banner[];        // { id, kind: "urgent" | "warning" | "info", text, ruleId }
  owed: Owed[];             // { kind, amountInr, formula, dueDate, daysLate?, ruleId }
  fraud?: Fraud;            // regime, day, liability, maxLossInr, reportBy, ruleId
  missing: FactKey[];       // facts the rules needed, most important first (→ follow-up questions)
};
```

`status` is one of `do_now | waiting | file_by | closed | optional | done`.
