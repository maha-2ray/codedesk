# CodeDesk

A secure, cross-platform desktop examination platform for Computer Science and
Software Engineering education.

Unlike general-purpose CBT systems, CodeDesk assesses **both theoretical
knowledge and practical programming ability** in one controlled environment:
multiple-choice and essays alongside code that is compiled, executed against
test cases and graded automatically.

> **Status — Milestone 1 (Foundation).** The application shell, domain model,
> IPC bridge, durable autosave and role-based routing are implemented and run
> against a mock backend. The Monaco editor, code execution and proctoring are
> scheduled for later milestones. See [`docs/roadmap.md`](./docs/roadmap.md).

## Getting started

```bash
npm install
npm start
```

The app launches against an in-memory mock backend. Sign in with any demo
account listed on the login screen — the password is `codedesk`, and accounts
with 2FA accept any six-digit code.

| Account | Role | Sees |
| --- | --- | --- |
| `2021/CS/0142` | Student | Dashboard, live exam runner |
| `STAFF/CS/018` | Lecturer (2FA) | Courses, exams, question-bank stats |
| `STAFF/EX/004` | Invigilator | Monitoring routes |
| `STAFF/REG/001` | Admin (2FA) | Administration routes |

Try the student account and enter **CS201 Final Examination** to see the exam
runner: live timer, question navigator, autosave indicator and submission.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Run in development with hot reload |
| `npm run lint` | ESLint over `.ts`, `.tsx`, `.mts` |
| `npm run package` | Build an unpackaged app bundle |
| `npm run make` | Build distributables (Squirrel, ZIP, deb, rpm) |
| `npx tsc --noEmit` | Type-check |

### Connecting a real backend

The client talks to a backend exclusively through the `CodeDeskApi` interface.
Implement it with `fetch` against [`docs/api-contract.md`](./docs/api-contract.md),
then set:

```bash
VITE_API_BASE_URL=https://exams.example.edu/api/v1
```

and swap the export in `src/api/index.ts`. No UI code changes.

## Architecture

```
src/
├── main.ts                  Electron entry: window, hardening, lifecycle
├── preload.ts               Context-isolated bridge (window.codedesk)
├── main/
│   ├── storage.ts           Atomic attempt snapshots + offline outbox
│   ├── environment.ts       Display enumeration, remote-session heuristics
│   └── ipc-handlers.ts      Registered IPC handlers
├── shared/ipc.ts            Typed IPC contract + channel allow-list
├── types/                   Normative domain model (UI-free)
├── api/
│   ├── contract.ts          The API seam
│   └── mock/                In-memory backend + fixtures
├── stores/                  Zustand: session, attempt, UI
├── hooks/                   Query bindings, timer, connectivity
├── components/              Layout, auth guards, exam UI, primitives
├── screens/                 Login, dashboards, exam runner, settings
└── constants/routes.ts      Route table + role navigation
```

Full detail in [`docs/architecture.md`](./docs/architecture.md).

### Design decisions worth knowing

**Answers are written to disk before the network.** Every edit updates memory
immediately, and the 2-second autosave writes a local snapshot *before*
attempting to sync. A crash or outage costs at most one autosave interval.

**Offline is a supported state, not an error.** Failed syncs go to a durable
outbox and retry with exponential backoff; the UI tells the candidate their work
is safe rather than showing an error.

**The mock backend behaves like a real one.** It simulates latency, rejects
stale revisions, locks submitted attempts and strips answer keys from delivered
papers — so moving to a real backend does not surface bugs the mock was hiding.

**Client-side permission guards are usability, not security.** The backend
re-checks every request; the guards exist to avoid presenting doomed actions.

**Session tokens live in memory only.** Exam machines are usually shared, so a
restart requires signing in again.

## Technology

Electron Forge · React 19 · TypeScript (strict) · Tailwind CSS v4 · Zustand ·
TanStack Query · React Router · Monaco Editor (wiring in Milestone 2) · Vite

Backend targets, per the PRD: Spring Boot or NestJS, PostgreSQL, Redis, Docker,
with Judge0 or Piston for sandboxed code execution.

## Contributing

- Run `npm run lint` and `npx tsc --noEmit` before pushing; both must be clean.
- Extend `src/types/` first when adding a feature — exhaustive `switch`
  statements will point you at every site that needs updating.
- Keep `electron` and Node imports out of the renderer; add a channel to
  `src/shared/ipc.ts` instead.

## Licence

MIT © Muhammed L. Touray
