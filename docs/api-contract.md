# CodeDesk API Contract

This document specifies the HTTP surface the desktop client expects. It is the
authoritative reference for the backend team (Spring Boot or NestJS).

The client consumes this contract exclusively through the `CodeDeskApi`
interface in `src/api/contract.ts`. The current build binds that interface to
an in-memory mock (`src/api/mock/mock-api.ts`). Implementing this document and
switching the binding in `src/api/index.ts` is the whole migration — no UI code
changes.

---

## 1. Conventions

**Base URL** — supplied via the `VITE_API_BASE_URL` environment variable. All
paths below are relative to `{base}/api/v1`.

**Content type** — `application/json; charset=utf-8` for requests and responses.

**Timestamps** — ISO-8601 in UTC with a `Z` suffix (`2026-07-27T09:30:00Z`).
The client never trusts its own clock for exam deadlines; `expiresAt` from the
server is authoritative.

**Identifiers** — UUIDv4 strings.

**Authentication** — `Authorization: Bearer {accessToken}` on every endpoint
except `/auth/login`, `/auth/verify-totp` and `/auth/refresh`.

### Error envelope

Every non-2xx response uses this shape:

```json
{
  "code": "STALE_REVISION",
  "message": "The submitted revision is behind the server state.",
  "fieldErrors": { "identifier": "This field is required." }
}
```

`fieldErrors` is optional and present only for 422 validation failures. The
client maps `code` onto `ApiError.code` and treats status `0`, `429` and `5xx`
as retryable.

| Status | Meaning |
| --- | --- |
| 400 | Malformed request |
| 401 | Missing or expired token |
| 403 | Authenticated but lacking the required permission |
| 404 | Resource not found, or deliberately hidden from this caller |
| 409 | State conflict (stale revision, attempt already closed) |
| 422 | Validation failure |
| 429 | Rate limited; honour `Retry-After` |

---

## 2. Security requirements on the backend

These are contract obligations, not suggestions. The client is written assuming
each one holds.

1. **Answer keys must never reach a student client.** Strip
   `correctChoiceId`, `correctChoiceIds`, `correctAnswer`, `acceptedAnswers`,
   `correctPairs`, `correctOrder`, `expectedOutput`, `expectedResult`,
   `referenceSolution`, `explanation`, `flagHash` and `verificationScript` from
   every question served through `POST /attempts`. The mock does exactly this
   in `stripAnswerKey`, so the client is never accidentally coupled to fields
   it will not receive in production.
2. **Hidden test cases must not disclose their IO.** Return the id, weight and
   `visibility` only; blank the `stdin` and `expectedStdout`.
3. **Hidden tests only run during grading**, server-side. `POST /attempts/{id}/run`
   evaluates public tests exclusively.
4. **Every permission is re-checked server-side.** The client's RBAC guards
   exist to avoid presenting doomed actions, nothing more.
5. **`expiresAt` is server-issued** and must be enforced when accepting
   submissions. A client whose clock is wrong or tampered with must not gain time.
6. **Grading never trusts client-submitted marks.**

---

## 3. Authentication

### `POST /auth/login`

```json
{ "identifier": "2021/CS/0142", "password": "…", "totpCode": "123456" }
```

`identifier` accepts either an email address or an institutional
matriculation/staff number. `totpCode` is optional.

Responses (all `200`; the outcome is in the body so the client can branch
without treating an expected state as an error):

```json
{ "outcome": "SUCCESS", "session": { "user": {...}, "institution": {...},
  "tokens": { "accessToken": "…", "refreshToken": "…", "expiresAt": 1790000000000 },
  "extraPermissions": [] } }
```

```json
{ "outcome": "TOTP_REQUIRED", "challengeId": "…" }
```

```json
{ "outcome": "INVALID_CREDENTIALS" }
```

```json
{ "outcome": "ACCOUNT_LOCKED", "until": "2026-07-27T10:00:00Z" }
```

Return `INVALID_CREDENTIALS` for both an unknown identifier and a wrong
password, so the endpoint cannot be used to enumerate accounts. Rate-limit by
identifier and by source IP.

### `POST /auth/verify-totp`

```json
{ "challengeId": "…", "code": "123456" }
```

Returns the same `LoginResult` union. Challenges should expire after ~5 minutes.

### `POST /auth/refresh`

```json
{ "refreshToken": "…" }
```

→ `200` with a fresh `AuthTokens`. Rotate the refresh token on every use.

### `POST /auth/logout`

→ `204`. Revokes the refresh token.

### `GET /auth/me`

→ `200` with the current `User`.

---

## 4. Exams

### `GET /exams`

Query parameters: `courseId`, `status`.

Returns `ExamSummary[]`, scoped to the caller: students never receive `DRAFT`
exams, and lecturers see only exams for courses they teach.

```json
[{
  "id": "…", "title": "CS201 Final Examination", "courseCode": "CS201",
  "courseTitle": "Data Structures and Algorithms", "status": "ACTIVE",
  "startsAt": "2026-07-27T09:00:00Z", "endsAt": "2026-07-27T21:00:00Z",
  "durationMinutes": 120, "totalMarks": 35, "questionCount": 7,
  "attemptStatus": "NOT_STARTED"
}]
```

`attemptStatus` is populated for students only.

### `GET /exams/{examId}`

→ `200` with the full `Exam`, including `sections`, `security`, `grading` and
`randomisation`. Requires `exam:create` or ownership; students use the attempt
endpoint instead.

### `POST /exams` — requires `exam:create`

Body is a partial `Exam`. Created in `DRAFT`. → `201`.

### `PATCH /exams/{examId}` — requires `exam:create`

Partial update. Reject edits to an exam in `ACTIVE` status with `409`.

### `POST /exams/{examId}/publish` — requires `exam:publish`

Transitions `DRAFT` → `SCHEDULED`. → `200` with the updated exam.

---

## 5. Attempts

### `POST /attempts`

```json
{ "examId": "…" }
```

**Must be idempotent.** Calling it again for the same (student, exam) returns
the existing attempt rather than creating a second one — a candidate whose app
crashes will call it again on restart.

On first call the server:
1. Verifies the exam is `ACTIVE` and the caller is within
   `startsAt + lateEntryMinutes`.
2. Applies `randomisation` to draw and order the questions for this candidate.
3. Strips every answer key (see §2).
4. Sets `expiresAt = now + durationMinutes`, capped at the exam's `endsAt`.

→ `201` (or `200` when resuming):

```json
{
  "attempt": { "id": "…", "examId": "…", "studentId": "…",
    "status": "IN_PROGRESS", "startedAt": "…", "expiresAt": "…", "revision": 0 },
  "paper": { "examId": "…", "attemptId": "…", "title": "…", "courseCode": "CS201",
    "durationMinutes": 120, "security": {...}, "totalMarks": 35,
    "sections": [{ "id": "…", "title": "Section A — Theory", "questions": [...] }] }
}
```

Errors: `403 EXAM_NOT_OPEN`, `403 LATE_ENTRY_CLOSED`, `409 ATTEMPT_ALREADY_SUBMITTED`.

### `GET /attempts/{attemptId}`

→ `200` with the `Attempt`. Used to poll status and re-read `expiresAt`.

### `PUT /attempts/{attemptId}/answers`

The autosave endpoint. Called at most every 2 seconds while there are unsaved
edits, and once immediately before submission.

```json
{
  "attemptId": "…",
  "revision": 4,
  "answers": [ { "kind": "CODE", "questionId": "…", "language": "PYTHON",
                 "source": "…", "updatedAt": "…", "flagged": false,
                 "timeSpentMs": 45000 } ],
  "queuedAt": "2026-07-27T09:31:00Z"
}
```

Semantics:
- **Upsert by `questionId`**, never a full replace — the batch contains only
  dirty answers.
- **Optimistic concurrency**: reject with `409 STALE_REVISION` when
  `revision < attempt.revision`. The client resolves and retries.
- Reject with `409 ATTEMPT_CLOSED` once the attempt is submitted or expired.
- Must be **idempotent on replay**: the offline outbox can resend a batch the
  server already accepted.

→ `200 { "revision": 5 }` — the new server revision.

### `GET /attempts/{attemptId}/answers`

→ `200` with `Answer[]`. Used when resuming on a different machine. The client
merges these with its local snapshot, preferring the snapshot when its revision
is greater or equal.

### `POST /attempts/{attemptId}/run`

Executes candidate code against **public tests only**.

```json
{ "questionId": "…", "language": "PYTHON", "source": "…", "stdin": "optional" }
```

Runs in the sandbox (Judge0/Piston) under the question's `ExecutionLimits`:
wall-clock timeout, memory cap and no network unless `allowNetwork` is set.

→ `200` with `ExecutionResult`:

```json
{
  "id": "…", "questionId": "…", "status": "COMPLETED",
  "compileOutput": "", "totalRuntimeMs": 48, "peakMemoryKb": 9216,
  "createdAt": "…",
  "tests": [{ "testCaseId": "…", "name": "Example case", "visibility": "PUBLIC",
    "passed": true, "stdin": "…", "expectedStdout": "…", "actualStdout": "…",
    "stderr": "", "runtimeMs": 24, "memoryKb": 9216, "marksAwarded": 5 }]
}
```

`status` ∈ `QUEUED | COMPILING | RUNNING | COMPLETED | COMPILE_ERROR |
RUNTIME_ERROR | TIME_LIMIT_EXCEEDED | MEMORY_LIMIT_EXCEEDED | INTERNAL_ERROR`.

Rate-limit per attempt (a sensible default is 1 run per 5 seconds per question)
to stop the sandbox being used as free compute.

### `POST /attempts/{attemptId}/submit`

Finalises the attempt. The client always flushes pending answers first, but the
server must accept a final `answers` flush in the same request if present.

→ `200` with the updated `Attempt` (`status: "SUBMITTED"`). Grading is
asynchronous; queue it here.

Errors: `409 ATTEMPT_CLOSED`.

### `GET /attempts/{attemptId}/result`

→ `200` with `AttemptResult`, or `404 RESULT_NOT_READY` when grading is
incomplete or the lecturer has not released marks. `404` here is an expected
state, not an error — the client renders "results not yet available".

```json
{
  "attemptId": "…", "examId": "…", "studentId": "…",
  "marksAwarded": 28, "marksAvailable": 35, "percentage": 80, "passed": true,
  "comment": "Good work on Section B.",
  "questions": [{ "questionId": "…", "marksAwarded": 13, "marksAvailable": 15,
    "gradedBy": "AUTO", "feedback": "…", "tests": [...] }]
}
```

Honour `GradingPolicy.showTestResultsToStudent`: when false, omit `tests`.

---

## 6. Question bank

All endpoints require `question-bank:read`; writes require `question-bank:write`.

### `GET /questions`

Query parameters: `search`, `types` (repeatable), `difficulties` (repeatable),
`tags` (repeatable), `courseId`, `page` (1-based), `pageSize` (default 20).

→ `200` with `Paginated<Question>`:

```json
{ "items": [...], "page": 1, "pageSize": 20, "total": 137 }
```

Answer keys **are** included here — this endpoint is lecturer-only.

### `GET /questions/{questionId}` · `POST /questions` · `PATCH /questions/{questionId}` · `DELETE /questions/{questionId}`

Standard CRUD. Deleting a question referenced by a non-draft exam must fail with
`409 QUESTION_IN_USE`.

---

## 7. Courses

### `GET /courses`

→ `200` with `Course[]` scoped to the caller.

---

## 8. Planned endpoints

Declared so the backend team can plan the schema; the client does not call
these yet.

| Endpoint | Purpose | Milestone |
| --- | --- | --- |
| `POST /attempts/{id}/events` | Activity log: focus changes, clipboard, shortcuts | Proctoring |
| `GET /exams/{id}/live` | Invigilator's live candidate roster (SSE or WebSocket) | Invigilation |
| `POST /attempts/{id}/force-submit` | Invigilator force-submit | Invigilation |
| `GET /analytics/exams/{id}` | Question difficulty, failure rates, time-per-question | Analytics |
| `POST /attempts/{id}/grade` | Manual grade override and rubric marks | Grading |
| `GET /datasets/{id}/schema` | SQL question schema browser | SQL questions |

---

## 9. Data model reference

The TypeScript definitions in `src/types/` are the normative schema:

| File | Contents |
| --- | --- |
| `domain.ts` | `User`, `Institution`, `Course`, `UserRole`, `Permission`, RBAC matrix |
| `question.ts` | All 20 question variants, `TestCase`, `ExecutionLimits`, `EditorSettings` |
| `exam.ts` | `Exam`, `ExamSection`, `ExamPaper`, `Attempt`, security and grading policy |
| `answer.ts` | `Answer` union, `SyncEnvelope`, `ExecutionResult`, `AttemptResult` |
| `auth.ts` | `LoginCredentials`, `Session`, `AuthTokens`, `LoginResult` |

Generating backend DTOs from these, or vice versa, is recommended over
maintaining two hand-written copies.
