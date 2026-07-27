# CodeDesk Roadmap

Milestone 1 is complete. Later milestones are ordered by dependency, not by
importance — each unlocks the next.

## ✅ Milestone 1 — Foundation (this change)

- Typed domain model: 4 roles, RBAC matrix, 8 theory + 12 practical question types
- Context-isolated IPC bridge with a channel allow-list
- Durable attempt storage: atomic snapshots + offline outbox
- Session, attempt and UI stores; 2-second autosave loop with backoff retry
- Role-guarded routing; login (with TOTP), student and lecturer dashboards
- Working exam runner: timer, navigator, autosave indicator, submission
- Mock backend mirroring real behaviour, plus the written API contract

## Milestone 2 — Code editor and execution

Depends on: backend `POST /attempts/{id}/run` and a Judge0/Piston deployment.

- Monaco integration honouring per-question `EditorSettings`
- Language selector with per-language drafts preserved
- Public-test runner panel: pass/fail, stdout, stderr, compile output
- Read-only regions for `COMPLETE_CODE`; diff view for `DEBUG_CODE` / `REFACTOR_CODE`
- Markdown rendering for prompts, with syntax-highlighted snippets
- Drag-and-drop surfaces for `MATCHING` and `ORDERING`; `FILL_IN_BLANK` inputs

## Milestone 3 — Lecturer tooling

- Question bank: filter, search, tag, duplicate, import/export
- Exam builder: drag-and-drop sections, randomisation, negative marking
- Grading queue: rubric-based essay marking, override of automatic marks
- Per-question and per-cohort analytics

## Milestone 4 — Proctoring and exam security

Deferred by decision in Milestone 1. Reliable, cross-platform items first.

**Tier 1 — reliable, cross-platform**
- Fullscreen/kiosk enforcement (IPC already in place)
- Focus-loss detection and the activity log
- Clipboard interception; configurable copy/paste blocking
- Inactivity timeout with auto-submit
- Multi-monitor detection (`screen` API already wired)

**Tier 2 — best-effort, platform-specific**
- Remote-desktop heuristics — a signal for human review, never a hard block
- Blocked application detection where the OS permits

**Tier 3 — requires privacy review before any implementation**
- Webcam, screen and microphone capture; face verification
- Must be opt-in per institution, with explicit candidate consent, a documented
  retention period and a lawful basis recorded under GDPR

## Milestone 5 — Invigilation

- Live candidate roster over SSE/WebSocket
- Alert feed sourced from the activity log
- Force-submit and identity verification

## Milestone 6 — Practical environments

Each needs backend sandbox support before client work begins.

- SQL runner with schema browser
- HTML/CSS and React sandboxes with live preview
- Interactive Linux terminal and Git repository simulation
- Networking simulator and CTF challenge environments

## Milestone 7 — Hardening for scale

- Auto-update channel
- Crash reporting
- Automated test suite: unit, integration, and Playwright end-to-end
- CI pipeline with signed builds for Windows, macOS and Linux
- Load validation against the 1000-concurrent-candidate target

---

## Success metrics from the PRD

| Metric | Status |
| --- | --- |
| Autosave < 2 s | ✅ 2 s interval implemented |
| UI response < 100 ms | ✅ Optimistic local updates |
| 99.9% data integrity | ✅ Atomic writes + outbox + revisions (needs load validation) |
| 10+ languages | ✅ 12 typed (execution pending Milestone 2) |
| 1000 concurrent candidates | ⬜ Backend concern; needs load testing |
| 80% grading-time reduction | ⬜ Needs the auto-grading pipeline |
