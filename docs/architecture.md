# CodeDesk Desktop Client — Architecture

## Scope

This repository is the **desktop client only**. The backend, the code-execution
sandbox and object storage are separate services described in the PRD and
specified in [`api-contract.md`](./api-contract.md).

```
┌──────────────────────────── this repo ───────────────────────────┐
│  Electron main process          │  Renderer (React)               │
│  ─────────────────────          │  ──────────────────             │
│  • window + lifecycle           │  • routing / RBAC guards        │
│  • durable attempt storage      │  • Zustand stores               │
│  • offline outbox               │  • TanStack Query               │
│  • environment inspection       │  • screens + components         │
│         ▲                       │         ▲                       │
│         └──── typed IPC bridge (preload, context-isolated) ───────┘
└──────────────────────┬───────────────────────────────────────────┘
                       │ HTTPS (CodeDeskApi)
        ┌──────────────┴───────────────┐
        │  Backend (Spring Boot/Nest)  │
        │  PostgreSQL · Redis · MinIO  │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴───────────────┐
        │  Judge0 / Piston (Docker)    │
        └──────────────────────────────┘
```

## Process model

**Main** owns everything that touches the OS: the window, the filesystem and
display enumeration. It is the only place `electron` and Node built-ins are
imported.

**Preload** exposes a narrow, explicitly enumerated API on `window.codedesk`
under context isolation. Channels are validated against a shared allow-list
(`src/shared/ipc.ts`), so the renderer cannot reach an unregistered handler even
if it is compromised.

**Renderer** is a plain React application. It never imports `electron`, and it
feature-detects `window.codedesk` so it still runs in a browser harness for
testing.

### Window hardening

| Setting | Value | Why |
| --- | --- | --- |
| `contextIsolation` | `true` | Renderer cannot touch preload internals |
| `nodeIntegration` | `false` | No Node in renderer |
| `webSecurity` | `true` | Same-origin policy enforced |
| `setWindowOpenHandler` | deny + `shell.openExternal` | No popups during an exam |
| `will-navigate` | blocked outside the dev server | Renderer cannot leave the app |
| DevTools | development only | Packaged exam clients ship without them |
| Single-instance lock | enabled | Prevents a second unmonitored window and snapshot races |

A CSP is declared in `index.html`. Electron Fuses (already configured in
`forge.config.ts`) disable `RunAsNode`, enable cookie encryption and enforce
ASAR integrity in packaged builds.

## Data flow

### Reads

Screens call TanStack Query hooks in `src/hooks/queries.ts`, which call the
`api` seam. Query keys are centralised so invalidation stays consistent.

### Writes during an exam

The attempt store (`src/stores/attempt-store.ts`) owns the data a candidate must
never lose, and follows a strict ordering on every edit:

1. **Update memory immediately** — UI response stays well under the 100 ms budget.
2. **Mark the answer dirty.**
3. **On the 2-second tick, write a disk snapshot via IPC *before* the network
   call.** Disk is fast and always available; the network is neither.
4. **Push the batch to the server.** On failure, append it to the durable
   outbox and retry with exponential backoff (1s → 2s → 5s → 10s → 30s).

The worst case is therefore losing at most one autosave interval, and only if
the machine itself dies mid-write.

```
edit → memory → dirty set ──(2s)──> disk snapshot ──> PUT /answers
                                         │                 │
                                         │            ok ──┴─> clear dirty, ack outbox
                                         └── fail ────────> outbox + backoff retry
```

### Crash recovery

Snapshots live in `{userData}/attempts/snapshots/{attemptId}.json`. On resume,
`startAttempt` fetches server answers and merges the local snapshot over them
when the snapshot's revision is greater or equal — the snapshot may hold work
written just before a crash that never reached the network.

### Atomic writes

Every write goes to `{file}.{pid}.tmp` and is then renamed over the target.
Rename is atomic on POSIX and NTFS, so a crash mid-write can never leave a
truncated snapshot. A corrupt file is logged and skipped rather than throwing —
a bad snapshot must not prevent an exam from starting.

### Concurrency

`SyncEnvelope.revision` gives optimistic concurrency. The server rejects a stale
batch with `409 STALE_REVISION`. Envelopes are keyed by attempt and deduplicated
by revision in the outbox, and the server must be idempotent on replay because
the outbox can resend a batch that was already accepted.

## State ownership

| Store | Scope | Persistence |
| --- | --- | --- |
| `session-store` | User, institution, tokens, RBAC | **Memory only** — tokens must not survive on a shared lab machine |
| `attempt-store` | Live attempt, answers, sync state, timer | Disk snapshot + outbox via IPC |
| `ui-store` | Theme, font size, scale, accessibility | `localStorage` (per-machine comfort settings) |

Server data is not duplicated into Zustand; it stays in the Query cache.

## Routing

`HashRouter`, not `BrowserRouter`: a packaged renderer loads from `file://`,
where history-based routing cannot resolve deep paths on reload.

Guards compose declaratively — `RequireAuth` → `RequireRole` → `RequirePermission`.
They are a **usability** measure, not a security boundary; the backend re-checks
every request. Their job is to keep users out of screens that would only fail.

The exam runner is mounted **outside** the dashboard shell, so a candidate mid-attempt
sees no navigation leading away from the exam.

## Type system

`src/types/` is the normative domain model and is deliberately UI-free so it can
be shared with a future mobile companion or used to generate backend DTOs.

Questions and answers are **discriminated unions**. The dispatcher in
`question-surface.tsx` switches exhaustively on `question.type`, so adding a
question variant is a compile error until every site handles it. Answers are
keyed by `kind` rather than by question type, because several question types
share an answer shape — every code-editor variant produces a `CODE` answer.

## The API seam

Everything goes through `CodeDeskApi` (`src/api/contract.ts`). The mock
implementation deliberately mimics real backend behaviour — latency, auth
failures, revision conflicts, answer-key stripping — so swapping in the HTTP
binding does not surface a class of bugs the mock was hiding.

Moving to a real backend: implement the interface with `fetch`, set
`VITE_API_BASE_URL`, and change one export in `src/api/index.ts`.

## Accessibility

Semantic landmarks and headings throughout; `aria-live` on the timer, autosave
and connection indicators; every control keyboard-reachable with a visible
focus ring. Font size, interface scale, high contrast and reduced motion are
user settings, persisted so they survive a mid-session restart. The OS-level
`prefers-reduced-motion` is also honoured in CSS.

## Deliberate deferrals

| Area | Status | Rationale |
| --- | --- | --- |
| Proctoring / anti-cheat | Types and IPC signals only | Scoped out of this milestone by decision; the raw signals (focus, displays, kiosk) are already plumbed |
| Monaco editor | Dependency installed, not yet wired | Next milestone |
| SQL / terminal / React / CTF questions | Typed, stubbed in the UI | Each needs backend sandbox support first |
| Remote-desktop detection | Heuristic, best-effort | Cannot be made reliable cross-platform; treat as a signal for human review, never a hard block |
| Webcam / screen / microphone capture | Not started | Carries significant GDPR weight; must be opt-in per institution and needs a privacy review before implementation |
