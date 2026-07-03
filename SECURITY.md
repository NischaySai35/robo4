# Security Policy

The security of TETROBOT and its users matters. Thank you for helping keep it safe.

## Supported versions

Only the latest release / `main` branch receives security fixes.

| Version | Supported |
|---------|-----------|
| latest (`main`) | ✅ |
| older releases  | ❌ |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately to **nischaysai35@gmail.com** with the subject line
`SECURITY: <short summary>`. Include:

- a description of the issue and its impact,
- steps to reproduce (proof-of-concept if possible),
- affected version / commit,
- any suggested fix.

You can expect:

- an acknowledgement within **72 hours**,
- an initial assessment within **7 days**,
- coordinated disclosure once a fix is available — please give reasonable time to
  patch before any public disclosure.

## Scope

In scope: the desktop/web app (`frontend/`), the optional backend (`backend/`), and
the ESP32 firmware (`esp32/`).

Out of scope: third-party dependencies (report those upstream), issues requiring
physical access to an already-compromised machine, and self-inflicted misconfiguration.

## Note on the `.nischay` format

Project files use lightweight app-format obfuscation (SHA-256 keystream XOR), **not**
secure encryption — the key ships in the client. Do not rely on `.nischay` files to
protect secrets. This is by design and not considered a vulnerability.
