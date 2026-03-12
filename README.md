# EcoleDirecte MCP Server

Local [Model Context Protocol](https://modelcontextprotocol.io/) server (stdio) for [EcoleDirecte](https://www.ecoledirecte.com) — the French platform used by students, families, and teachers for homework, messaging, calendars, and more.

## Features (v0.1)

- **Direct login** — authenticates via the EcoleDirecte private API with the GTK bootstrap + credential POST flow.
- **TOTP 2FA** — handles the two-factor continuation when the account requires it.
- **Session import** — import an existing session from a browser-export JSON file.
- **Credential & session persistence** — saves auth material locally under `~/.ecoledirecte/` with strict file permissions (0600/0700).
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

## MCP Tools

| Tool | Description |
|------|-------------|
| `login` | Authenticate with username and password |
| `submit_totp` | Complete 2FA with a TOTP code |
| `import_session` | Load a session from a browser-export JSON file |
| `auth_status` | Check current authentication state |
| `logout` | Clear the session (keeps saved credentials) |
| `logout_full` | Clear both session and saved credentials |

## Browser Session Export Format

To import an existing browser session, create a JSON file with this structure:

```json
{
  "token": "<X-Token value from authenticated requests>",
  "cookies": {
    "GTK": "<GTK cookie value>",
    "...": "other cookies"
  },
  "xGtk": "<X-GTK header value>",
  "version": "4.96.3"
}
```

Then use the `import_session` tool with the file path.

## Auth Flow (Reverse-Engineered)

1. **Bootstrap GET** → `https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.96.3`
   - Obtains GTK cookie and header values needed for authentication.

2. **Login POST** → `https://api.ecoledirecte.com/v3/login.awp?v=4.96.3`
   - Content-Type: `application/x-www-form-urlencoded`
   - Body: `data=<url-encoded JSON>` with `{identifiant, motdepasse, isReLogin, uuid, fa}`
   - Headers: `X-GTK` from bootstrap, cookies from bootstrap.

3. **Response handling:**
   - Code `200` → authenticated, token in response.
   - Code `250` → 2FA required, challenge data in response.
   - Code `505` → invalid credentials.
   - Code `516`/`535` → account blocked.

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
├── server/tools.ts                   # MCP tool definitions
└── ecoledirecte/
    ├── logging.ts                    # Structured logging with redaction
    ├── api/
    │   ├── constants.ts              # Endpoints, headers, defaults
    │   └── normalize.ts              # Response normalization
    ├── auth/
    │   ├── types.ts                  # Auth state machine types
    │   ├── service.ts                # Login/TOTP/restore orchestration
    │   ├── store.ts                  # Persistence interface
    │   ├── fileStore.ts              # File-system persistence adapter
    │   └── sessionImport.ts          # Browser-export file parser
    └── http/
        └── client.ts                 # Cookie-aware HTTP client
```

## License

MIT
