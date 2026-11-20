# Haq evaluation results

Run 2026-11-20 18:07 UTC · model `claude-opus-5-5` · effort `medium` · 20 fictional stories (`evals/stories/`) · cost $0.45 · latency p50 5.2 s, p95 7.2 s

Reproduce with `npm run eval` (needs `ANTHROPIC_API_KEY`).

| Eval | What it checks | Result | Target | |
|---|---|---|---|---|
| EVAL-1 | Entity & transaction type (entityType, txnType, problem) exact match | 100.0% | ≥ 90.0% | ✅ pass |
| EVAL-1 | Dates & amounts (amountInr, txnDate, complaintDate) exact match | 100.0% | ≥ 85.0% | ✅ pass |
| EVAL-1 | Complaint in writing? (complaintMode) exact match | 100.0% | — |  |
| EVAL-2 | Facts shown that don't quote the story (after verification) | 0 | 0 | ✅ pass |
| EVAL-2 | Facts dropped by verification before showing | 0 of 201 (0.0%) | report | |
| EVAL-3 | Deliberately missing fields left empty | 8/8 (100.0%) | ≥ 90% | ✅ pass |
| EVAL-4 | End to end: correct track **and** current-step status | 20/20 | ≥ 18/20 | ✅ pass |

## Per field

| Field | Exact match |
|---|---|
| `entityName` | 100.0% |
| `entityType` | 100.0% |
| `txnType` | 100.0% |
| `problem` | 100.0% |
| `amountInr` | 100.0% |
| `txnDate` | 100.0% |
| `complainedToEntity` | 100.0% |
| `complaintMode` | 100.0% |
| `complaintDate` | 100.0% |
| `entityResponse` | 95.0% |
| `entityResponseDate` | 95.0% |
| `reversed` | 100.0% |
| `reversedDate` | 100.0% |
| `accountType` | 100.0% |

## Per story

| Story | Lang | Track | Current step | End to end | Field misses |
|---|---|---|---|---|---|
| `b01-upi-hinglish` | hinglish | BANKING | do_now | ✅ | — |
| `b02-imps-written` | en | BANKING | waiting | ✅ | — |
| `b03-atm-hinglish` | hinglish | BANKING | do_now | ✅ | — |
| `b04-fraud-jandhan-hinglish` | hinglish | BANKING | waiting | ✅ | — |
| `b05-card-online-rejected` | en | BANKING | file_by | ✅ | — |
| `b06-card-pos-verbal` | en | BANKING | do_now | ✅ | — |
| `b07-rbi-window-closed` | en | BANKING | file_by | ✅ | — |
| `b08-kyc-scam-hinglish` | hinglish | BANKING | waiting | ✅ | — |
| `c01-refund-ecommerce` | en | CONSUMER | file_by | ✅ | — |
| `c02-defective-marketplace` | en | CONSUMER | file_by | ✅ | — |
| `c03-local-shop-hinglish` | hinglish | CONSUMER | do_now | ✅ | entityResponse: expected "unsatisfactory", got "rejected" |
| `c04-courier-lost` | en | CONSUMER | do_now | ✅ | — |
| `c05-coaching-service` | en | CONSUMER | do_now | ✅ | — |
| `c06-wrong-item-hindi` | hi | CONSUMER | waiting | ✅ | — |
| `c07-return-refund-no-complaint` | en | CONSUMER | do_now | ✅ | — |
| `i01-claim-rejected` | en | INSURANCE | do_now | ✅ | — |
| `i02-grievance-no-reply` | en | INSURANCE | file_by | ✅ | — |
| `i03-grievance-rejected-closed` | en | INSURANCE | — | ✅ | — |
| `i04-travel-claim-cut` | en | INSURANCE | waiting | ✅ | — |
| `i05-death-claim-hinglish` | hinglish | INSURANCE | do_now | ✅ | entityResponseDate: expected null, got "2026-11-03" |
