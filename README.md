# EcoleDirecte MCP Server

Local [Model Context Protocol](https://modelcontextprotocol.io/) server (stdio) for [EcoleDirecte](https://www.ecoledirecte.com) — the French platform used by students, families, and teachers for homework, messaging, calendars, and more.

## Features (v0.1)

- **Direct login** — authenticates via the EcoleDirecte private API with the GTK bootstrap + credential POST flow.
- **TOTP 2FA** — handles the two-factor continuation when the account requires it.
- **Secure identity question** — handles the non-TOTP double-auth flow that asks the user to answer a verification question, then replays the login with the returned challenge proof.
- **Session import** — import an existing session from a browser-export JSON file, validated against the live API.
- **Session validation** — imported and restored sessions are probed through `rdt/sondages.awp` before being treated as authenticated; stale sessions are automatically cleared and fall back to saved credentials when available.
- **Named auth profiles** — manage separate credential sets (e.g. `parent` and `teacher`) under `~/.ecoledirecte/profiles/<name>/`. All auth tools accept an optional `profile` parameter to switch contexts.
- **Multi-family context switching** — when a session includes browser account metadata, data tools automatically renew the live token context with `renewtoken.awp` before requesting another family account.
- **Family messagerie** — lists family-level messages through the authenticated `familles/{id}/messages.awp` route.
- **Family message detail** — opens a selected family message read-only, decodes its content, and mirrors the web UI behavior that may mark it as read.
- **Student messagerie** — lists student-level messages through the authenticated `eleves/{id}/messages.awp` route.
- **Student notes** — returns period summaries and grade rows through the authenticated `eleves/{id}/notes.awp` route.
- **Student profile** — returns student identity and class metadata through the authenticated `eleves/{id}.awp` route.
- **Cahier de textes** — returns homework grouped by day through the authenticated `Eleves/{id}/cahierdetexte.awp` route.
- **Cahier de textes detail** — returns decoded homework content, lesson content, and typed attachment metadata for a selected day through the authenticated `Eleves/{id}/cahierdetexte/{date}.awp` route.
- **Cahier de textes attachment download** — downloads a selected homework or lesson attachment when the day-detail payload exposes either a direct file URL or telechargement-backed file identifiers.
- **Vie scolaire** — returns absences, dispenses, sanctions, and settings through the authenticated `eleves/{id}/viescolaire.awp` route.
- **Carnet de correspondance** — lists correspondence entries and follow-ups through the authenticated `eleves/{id}/eleveCarnetCorrespondance.awp` route.
- **Sessions RDV** — returns appointment sessions plus invitee metadata through the authenticated `E/{id}/sessionsRdv.awp` route.
- **Vie de la classe** — returns class-scoped data through the authenticated `Classes/{classId}/viedelaclasse.awp` route.
- **Emploi du temps** — returns timetable events grouped by day through the authenticated `E/{id}/emploidutemps.awp` route.
- **Family documents** — returns family-level documents grouped by category (factures, notes, vie scolaire, administratifs, inscriptions, entreprises) through the authenticated `familledocuments.awp` route.
- **Family invoices** — lists family-level invoices and signature documents through the authenticated `factures.awp` route.
- **Teacher messagerie** — lists teacher-level messages through the authenticated `enseignants/{id}/messages.awp` route.
- **Teacher emploi du temps** — returns teacher timetable events for a date range through the authenticated `P/{id}/emploidutemps.awp` route.
- **Teacher classes** — lists classes assigned to the teacher from account metadata.
- **Teacher class students** — returns the roster of students in a specific class through the authenticated `classes/{classId}/eleves.awp` route.
- **Teacher rooms** — lists available rooms through the authenticated `salles.awp` route.
- **Teacher note settings** — returns grading configuration through the authenticated `enseignants/{id}/parametrages.awp` route.
- **Teacher gradebook catalog** — returns the full gradebook navigation model (establishments, classes, groups, periods, subjects, council dates, attendance grid) through the authenticated `niveauxListe.awp` route.
- **Credential & session persistence** — saves auth material locally under `~/.ecoledirecte/` with strict file permissions (0600/0700). The credentials file path can be customized via `ECOLEDIRECTE_CREDENTIALS_FILE`.
- **Structured logging** — all sensitive data (passwords, tokens, cookies) is automatically redacted from log output.

## Quick Start

```bash
npm install
npm run build
```

### Use with an MCP client

Configure your MCP client to launch this server via stdio:

```json
{
  "mcpServers": {
    "ecoledirecte": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/EcoleDirecteMCP"
    }
  }
}
```

### Credentials file

The `login` tool reads credentials from a JSON file instead of accepting them as arguments.

1. **Default location:** `~/.ecoledirecte/credentials.json`
2. **Custom location:** set the `ECOLEDIRECTE_CREDENTIALS_FILE` environment variable to the absolute path of your credentials file.

Create the file with this structure:

```json
{
  "identifiant": "your-username",
  "motdepasse": "your-password",
  "fa": [
    {
      "cn": "optional-replay-cn",
      "cv": "optional-replay-cv",
      "uniq": false
    }
  ]
}
```

`fa` is optional. The server now writes reusable secure-question replay data back into this file automatically after a successful secure-question login so later `login` calls can skip repeating that challenge when EcoleDirecte still accepts the saved factor.

Keep the file permissions restrictive:

```bash
chmod 600 ~/.ecoledirecte/credentials.json
```

To use a custom path:

```json
{
  "mcpServers": {
    "ecoledirecte": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/EcoleDirecteMCP",
      "env": {
        "ECOLEDIRECTE_CREDENTIALS_FILE": "/secure/path/credentials.json"
      }
    }
  }
}
```

### Named profiles

When you need separate credentials for different account types (e.g. a parent account and a teacher account), use the `profile` parameter on auth tools:

```
login { "profile": "parent" }    → uses ~/.ecoledirecte/profiles/parent/credentials.json
login { "profile": "teacher" }   → uses ~/.ecoledirecte/profiles/teacher/credentials.json
```

Each profile stores its own `credentials.json` and `session.json` under `~/.ecoledirecte/profiles/<name>/`. The active profile is tracked in `~/.ecoledirecte/profiles.json`.

Create profile credentials:

```bash
mkdir -p ~/.ecoledirecte/profiles/teacher
cat > ~/.ecoledirecte/profiles/teacher/credentials.json <<'EOF'
{
  "identifiant": "teacher-username",
  "motdepasse": "teacher-password"
}
EOF
chmod 600 ~/.ecoledirecte/profiles/teacher/credentials.json
```

When no profile is specified, tools use the legacy default paths (`~/.ecoledirecte/credentials.json` and `session.json`).

## MCP Tools

| Tool | Description |
|------|-------------|
| `login` | Authenticate using credentials from the configured file. Optional `profile` to select a named credential set. |
| `submit_totp` | Complete 2FA with a TOTP code |
| `submit_doubleauth` | Answer the identity-verification question shown after login |
| `import_session` | Load a session from a browser-export JSON file and validate it. Optional `profile`. |
| `auth_status` | Check current authentication state and active profile (read-only) |
| `validate_session` | Validate the current session against the live API. Optional `profile`. |
| `list_family_messages` | List family-level messages for the authenticated family account |
| `get_family_message_detail` | Get the full content of a selected family message (may mark it as read) |
| `list_student_messages` | List student-level messages for one or more students (sequential) |
| `get_student_notes` | Get student notes plus period averages for one or more students |
| `get_student_profile` | Get identity and class metadata for one or more students |
| `get_student_cahier_de_textes` | Get student homework grouped by day for one or more students |
| `get_student_cahier_de_textes_day` | Get decoded homework content and lesson content for one or more students on a specific date |
| `download_student_cahier_de_textes_attachment` | Download a selected homework or lesson attachment from a student cahier de textes day detail |
| `get_student_vie_scolaire` | Get student absences, dispenses, sanctions, and settings for one or more students |
| `list_student_carnet_correspondance` | List carnet de correspondance entries for one or more students |
| `list_student_sessions_rdv` | List appointment sessions and invitee metadata for one or more students |
| `get_class_vie_de_la_classe` | Get class-level vie de la classe data for one or more students' classes |
| `get_student_emploi_du_temps` | Get timetable events grouped by day for one or more students |
| `get_family_documents` | Get family-level documents grouped by category |
| `list_family_invoices` | List family-level invoices and signature documents |
| `list_teacher_messages` | List messages for the authenticated teacher account |
| `get_teacher_emploi_du_temps` | Get teacher timetable for a date range (`dateDebut`, `dateFin`) |
| `list_teacher_classes` | List classes assigned to the teacher (from account metadata) |
| `get_teacher_class_students` | Get the student roster for a class (`classId`) |
| `list_teacher_rooms` | List available rooms for the teacher's establishment |
| `get_teacher_note_settings` | Get grading configuration (components, homework types, establishment parameters) |
| `get_teacher_gradebook_catalog` | Get the full gradebook navigation catalog (establishments, classes, groups, periods, subjects, council dates, attendance grid) |
| `logout` | Clear the session (keeps saved credentials). Optional `profile`. |
| `logout_full` | Clear both session and saved credentials. Optional `profile`. |

If multiple family accounts or students are available, pass `accountId` and/or `studentId`. When the imported or authenticated session includes browser account metadata such as `idLogin` and `current`, the server automatically switches to the requested family context before calling the private API. The tool error payload lists the available choices when selection is ambiguous.

Student-scoped tools accept an optional `students` array of `{studentId, accountId?}` targets. When omitted, the tool queries all known students sequentially, switching account context and renewing the token between each call. All tool calls are serialized to prevent concurrent API requests from causing stale-token conflicts.

Teacher tools use the `apip.ecoledirecte.com` host observed in live browser traffic, rather than the standard `api.ecoledirecte.com` used by family/student routes.

## Browser Session Export Format

To import an existing browser session, create a JSON file with this structure:

```json
{
  "token": "<X-Token value from authenticated requests>",
  "twoFaToken": "<2FA-Token value from authenticated requests>",
  "cookies": {
    "GTK": "<GTK cookie value>",
    "...": "other cookies"
  },
  "xGtk": "<X-GTK header value>",
  "accounts": [
    {
      "id": 828,
      "type": "1",
      "name": "Jane Doe",
      "establishment": "My School",
      "idLogin": 4229759,
      "main": true,
      "current": true,
      "students": [
        {
          "id": 1154,
          "name": "Antonin Doe",
          "classId": 18,
          "className": "3B",
          "classCode": "3B",
          "establishment": "My School"
        }
      ]
    }
  ],
  "version": "4.96.3"
}
```

For multi-family accounts, prefer a browser-style export that preserves each account's `idLogin` and `current` fields so the server can reproduce the live `renewtoken.awp` account switch. Then use the `import_session` tool with the file path.

## Auth Flow (Reverse-Engineered)

1. **Bootstrap GET** → `https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.96.3`
   - Obtains GTK cookie and header values needed for authentication.

2. **Login POST** → `https://api.ecoledirecte.com/v3/login.awp?v=4.96.3`
   - Content-Type: `application/x-www-form-urlencoded`
   - Body: `data=<url-encoded JSON>` with `{identifiant, motdepasse, isReLogin, uuid, fa}`
   - Headers: `X-GTK` from bootstrap, cookies from bootstrap.

3. **Response handling:**
   - Code `200` → authenticated, token in response.
  - Code `250` with `data.totp=true` → TOTP required.
  - Code `250` with `data.totp=false` → secure question required; fetch the question with `POST /v3/connexion/doubleauth.awp?verbe=get&v=4.96.3`, submit the chosen answer to `...verbe=post`, then replay `login.awp` with the returned `cn`/`cv` values inside the `fa` array. On success the reusable `fa` value is persisted back to `credentials.json` for future logins.
   - Code `505` → invalid credentials.
   - Code `516`/`535` → account blocked.
   - Code `521` → session/token expired.

4. **Session validation (probe):**
  - Imported and restored sessions are probed with `POST /v3/rdt/sondages.awp?verbe=get&v=4.96.3` and `data={}`.
   - If the probe returns code `200`, the session is promoted to authenticated.
   - If the probe returns code `521` (expired), the persisted session is cleared and the server falls back to saved credentials if available.

5. **Cross-family context switch:**
  - When a request targets another family account, the browser renews the session with `POST /v3/renewtoken.awp?verbe=post&v=4.96.3` and `data={"idUser":<account.idLogin>,"uuid":""}`.
  - The response rotates `X-Token`, `2FA-Token`, and cookies, and the server persists that updated authenticated context before retrying the data route.

## Data Routes (Reverse-Engineered)

- **Family messages** → `POST /v3/familles/{familyId}/messages.awp?force=false&typeRecuperation=received&idClasseur=0&orderBy=date&order=desc&query=&onlyRead=&page=0&itemsPerPage=100&getAll=0&verbe=get&v=4.96.3`
- **Family message detail** → `POST /v3/familles/{familyId}/messages/{messageId}.awp?verbe=get&mode=destinataire&v=4.96.3` with `data={"anneeMessages":"2025-2026"}`; this mirrors opening the message in the UI and can mark it as read
- **Student messages** → `POST /v3/eleves/{studentId}/messages.awp?force=false&typeRecuperation=received&idClasseur=0&orderBy=date&order=desc&query=&onlyRead=&page=0&itemsPerPage=100&getAll=0&verbe=get&v=4.96.3`
- **Student notes** → `POST /v3/eleves/{studentId}/notes.awp?verbe=get&v=4.96.3`
- **Student profile** → `POST /v3/eleves/{studentId}.awp?verbe=get&v=4.96.3` with `data={"anneeScolaire":""}`
- **Student cahier de textes** → `POST /v3/Eleves/{studentId}/cahierdetexte.awp?verbe=get&v=4.96.3`
- **Student cahier de textes day detail** → `POST /v3/Eleves/{studentId}/cahierdetexte/{date}.awp?verbe=get&v=4.96.3` with decoded `aFaire.contenu`, decoded `contenuDeSeance.contenu`, plus attachment arrays such as `documents`, `ressourceDocuments`, and `documentsRendus`
- **Student cahier de textes attachment file download** → `GET /v3/telechargement.awp?verbe=get&fichierId={fileId}&leTypeDeFichier={fileType}&v=4.96.3`; homework attachments observed in the live student UI use `leTypeDeFichier=FICHIER_CDT`
- **Student vie scolaire** → `POST /v3/eleves/{studentId}/viescolaire.awp?verbe=get&v=4.96.3`
- **Student carnet de correspondance** → `POST /v3/eleves/{studentId}/eleveCarnetCorrespondance.awp?verbe=get&v=4.96.3`
- **Student sessions RDV** → `POST /v3/E/{studentId}/sessionsRdv.awp?verbe=get&v=4.96.3`
- **Class vie de la classe** → `POST /v3/Classes/{classId}/viedelaclasse.awp?verbe=get&v=4.96.3`
- **Student emploi du temps** → `POST /v3/E/{studentId}/emploidutemps.awp?verbe=get&v=4.96.3`
- **Family documents** → `POST /v3/familledocuments.awp?archive=&verbe=get&v=4.96.3`
- **Family invoices** → `POST /v3/factures.awp?verbe=get&v=4.96.3`
- **Teacher messages** → `POST /v3/enseignants/{teacherId}/messages.awp?force=false&typeRecuperation=received&...&verbe=get&v=4.96.3`
- **Teacher emploi du temps** → `POST /v3/P/{teacherId}/emploidutemps.awp?verbe=get&v=4.96.3` with `data={"dateDebut":"YYYY-MM-DD","dateFin":"YYYY-MM-DD","avecTpiTemp":false}`
- **Teacher class students** → `POST /v3/classes/{classId}/eleves.awp?verbe=get&v=4.96.3`
- **Teacher rooms** → `POST /v3/salles.awp?verbe=get&v=4.96.3`
- **Teacher note settings** → `POST /v3/enseignants/{teacherId}/parametrages.awp?verbe=get&v=4.96.3`
- Except for the student profile route above, all data routes use the standard `data={}` form body and require the authenticated `X-Token` and `2FA-Token` headers.

## Explicitly Out of Scope (v1)

- SSO / OAuth / EduConnect federated login
- QR code or access-token login
- Account creation flows
- Password reset / update flows
- Direct browser profile reading

## Development

```bash
npm test          # Run tests
npm run lint      # Type-check without emitting
npm run dev       # Watch mode compilation
LOG_LEVEL=debug   # Set for verbose logging (debug|info|warn|error)
```

## Project Structure

```
src/
├── index.ts                          # stdio entrypoint
├── server/tools.ts                   # Auth MCP tool definitions (with profile support)
├── server/dataTools.ts               # Family, student, and teacher MCP tool definitions
└── ecoledirecte/
    ├── logging.ts                    # Structured logging with redaction
    ├── api/
    │   ├── constants.ts              # Endpoints, headers, defaults
    │   ├── normalize.ts              # Auth/session response normalization
    │   ├── messages.ts               # Messaging response normalization
    │   ├── notes.ts                  # Notes response normalization
    │   ├── studentProfile.ts         # Student profile normalization
    │   ├── cahierDeTextes.ts         # Homework response normalization
    │   ├── vieScolaire.ts            # School-life response normalization
    │   ├── carnetCorrespondance.ts   # Correspondence response normalization
    │   ├── sessionsRdv.ts            # Appointment session response normalization
    │   ├── vieDeLaClasse.ts          # Class-life response normalization
    │   ├── emploiDuTemps.ts          # Timetable response normalization
    │   ├── familyDocuments.ts        # Family documents response normalization
    │   ├── familyInvoices.ts         # Family invoices response normalization
    │   ├── teacherClassStudents.ts   # Teacher class roster normalization
    │   ├── teacherRooms.ts           # Teacher rooms normalization
    │   └── teacherNoteSettings.ts    # Teacher grading config normalization
    ├── auth/
    │   ├── types.ts                  # Auth state machine types (incl. profile & teacher metadata)
    │   ├── service.ts                # Login/TOTP/restore/profile orchestration
    │   ├── store.ts                  # Persistence interface (profile-aware)
    │   ├── fileStore.ts              # File-system persistence adapter (profile-aware)
    │   └── sessionImport.ts          # Browser-export file parser
    ├── data/
    │   └── service.ts                # Authenticated student, family, and teacher data access
    └── http/
        └── client.ts                 # Cookie-aware HTTP client
```

## License

MIT
