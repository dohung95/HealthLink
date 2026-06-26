# HealthLink AI Guidance

This is a monorepo with three modules: `HealthLink_BE` (Spring Boot 3.2, Java 21), `HealthLink_FE` (React/Vite), and `HealthLink_AI_Moderation` (Python).

## Module Routing

- **Backend/Spring/API/entity/service/controller/OpenAPI questions** — query the BE Graphify graph (`HealthLink_BE/graphify-out/graph.json`). If a graph is missing, run `graphify update .` from `HealthLink_BE/`.
- **Frontend/React/Vite/routes/pages/components/API-client questions** — query the FE Graphify graph (`HealthLink_FE/graphify-out/graph.json`). If a graph is missing, run `graphify update .` from `HealthLink_FE/`.
- **Cross BE-FE or API-contract questions** — query BE graph first, FE graph second, then compare targeted OpenAPI sections.
- **Mobile (HealthLink_MB, Flutter/Dart)** or **AI Moderation** — graph not yet available; fall back to `rg` and source browsing.

## Graphify Usage

- For codebase questions, run `graphify query "<question>"` from the relevant module directory when `graphify-out/graph.json` exists.
- Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts.
- After modifying code, run `graphify update .` from the changed module to keep the graph current (AST-only, no API cost).

## OpenAPI Source of Truth

- The committed API contract is `docs/openapi/healthlink-openapi.json`.
- Use BE/FE graph or source browsing first for understanding code. Only consult OpenAPI for contract-level questions.
- Query OpenAPI surgically with `rg` first by route fragment, HTTP method, controller/API keyword, DTO/schema name, `securitySchemes`, or `bearerAuth`.
- Never read the full OpenAPI file into context. Absolutely do not load the entire OpenAPI JSON.

## Security Scanning

- Semgrep OSS and CodeQL are configured in `.github/workflows/`.
- Both run on every push and pull request.
- Local scans: `semgrep scan --config auto .`
