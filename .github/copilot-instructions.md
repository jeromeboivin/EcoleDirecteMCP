# Project Guidelines

## Project Context

This repository is a local Model Context Protocol server for EcoleDirecte that runs over stdio in Node.js and TypeScript. The codebase should stay organized around clear boundaries: the MCP server surface in `src/server`, the EcoleDirecte HTTP transport in `src/ecoledirecte/http`, response normalization in `src/ecoledirecte/api`, auth and session orchestration in `src/ecoledirecte/auth`, and shared safety concerns such as logging and redaction in `src/ecoledirecte/logging.ts`. Preserve strict typing, predictable tool outputs, and clean separation between transport, domain logic, persistence, and MCP tool wiring.

Public EcoleDirecte pages describe the product as the online space for family, student, staff, and teacher users, and the public route surface exposes feature areas such as Cahier de Texte, Messagerie, Notes, Agenda and Emploi du temps, Coordonnées Famille, Compte, Paiements, Documents and téléchargements, formulaires et sondages, and Espaces Travail. For this project, treat EcoleDirecte as serving both family-facing workflows such as school-home communication, homework, grades, documents, timetable access, account and payment visibility, and professional workflows such as teacher or staff messaging, agenda management, class or student follow-up, documents, and administrative modules. Use that product scope when naming tools, designing session models, and prioritizing future reverse engineering.

## Engineering Standards

- Prefer small, typed, root-cause fixes over broad rewrites.
- Keep stdout reserved for MCP stdio transport. Any diagnostic output must go to stderr only.
- Never leak passwords, cookies, `X-GTK`, `X-Token`, `Authorization`, or 2FA material in logs, test output, fixtures, or documentation.
- Persist secrets outside the repository working tree. The current default is `~/.ecoledirecte/`, and file permissions must remain restrictive.
- Preserve the existing ESM TypeScript style, including `.js` import specifiers in TypeScript source.
- Keep MCP tool responses action-oriented: the caller should know whether it must retry, submit TOTP, import a session, or re-authenticate.
- Use official EcoleDirecte naming where possible instead of inventing English translations for routes or payload fields.

## Build And Test

- Install dependencies with `npm install`.
- Build with `npm run build`.
- Run the test suite with `npm test`.
- Run static type checks with `npm run lint`.
- Any change touching auth flows, request encoding, normalization, persistence, logging, or MCP tool outputs should add or update tests.
- Prefer fixture-driven unit tests for encoded request bodies, normalization of API codes, persistence round-trips, and session import parsing.
- Before finishing a substantial change, run build plus the relevant tests. If you cannot run a live validation path, keep the uncertainty isolated and documented in code or README.

## Reverse Engineering Rules

- When private API behavior is unclear, verify it against the live website before implementing guesses.
- Use Chrome DevTools as the default reverse-engineering tool for authentication, session, headers, cookies, query parameters, redirect behavior, and protected routes.
- Prefer concrete evidence from the Network, Application, and Console panels over inference from minified bundles alone.
- For auth work, confirm the full sequence in Chrome DevTools when needed: bootstrap request, request headers, cookie updates, `X-GTK` propagation, response codes, `X-Token` behavior, and any TOTP or re-login transitions.
- Do not hard-code a new auth branch, header contract, or session import rule until it has been observed in Chrome DevTools or another equally reliable live trace.
- When documenting reverse-engineered behavior, record only the contract and observations needed to maintain the code. Do not store real secrets, live personal data, or copied private payloads.

## Project Conventions

- Keep auth state explicit. Logged-out, pending login, TOTP-required, authenticated, imported-session, and error states should remain modeled with dedicated types.
- Keep normalization separate from raw fetch logic so private API status handling remains testable.
- Keep persistence behind an interface so the storage backend can change without rewriting auth orchestration.
- Update `README.md` whenever you add or materially change a user-visible MCP tool, a session import format, or a setup command.
- Favor deterministic inputs and outputs over implicit side effects. If a tool mutates persisted auth state, that behavior should be obvious from the tool contract and response text.