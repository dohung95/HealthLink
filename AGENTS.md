Always read `doc/skills/clean-coding-skill.md` and follow its rules for any implementation task.

## graphify

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

This repo uses module-local knowledge graphs for daily work. Root `graphify-out/` is optional and should not be assumed to exist. A missing root graph is never a reason to skip module-local graphs or fall back to source browsing.

## Skill routing

- At the start of a task, select applicable skills before acting.
- Use `superpowers:brainstorming` for creating or revising plans, specs, designs, new features, or behavior changes that are not already specified.
- After brainstorming/design approval, use `superpowers:writing-plans` to create the implementation plan.
- When the user provides an approved plan or says `PLEASE IMPLEMENT THIS PLAN`, use `superpowers:executing-plans` to review the plan and execute task-by-task.
- Prefer `superpowers:subagent-driven-development` over inline `executing-plans` when subagents are available and the plan has independent tasks.
- Use `superpowers:systematic-debugging` for bugs, failing tests, CI failures, or unexplained behavior.
- Use `superpowers:test-driven-development` for behavior-changing implementation when tests are appropriate.
- Use `superpowers:verification-before-completion` before claiming completion.
- Do not restart brainstorming for an already approved/provided implementation plan.
- Do not use heavy planning workflow for quick factual answers or narrow inspection-only questions.
- User instructions override skill workflow when explicitly stated.

## Graph routing

- Backend/Spring/API/entity/service/controller/OpenAPI questions: read `HealthLink_BE/AGENTS.md`, work from `HealthLink_BE`, then use `HealthLink_BE/graphify-out/graph.json`.
- Frontend/React/Vite/routes/pages/components/API-client questions: read `HealthLink_FE/AGENTS.md`, work from `HealthLink_FE`, then use `HealthLink_FE/graphify-out/graph.json`.
- Cross BE-FE or API-contract questions: read both module AGENTS files, query the BE graph first, query the FE graph second, then compare targeted OpenAPI sections.
- Missing root `graphify-out/graph.json` is not a reason to skip Graphify. First choose the applicable module, then check `HealthLink_BE/graphify-out/graph.json` or `HealthLink_FE/graphify-out/graph.json`.
- Root/cross-module architecture questions: use root `graphify-out/graph.json` only if it exists and the question truly spans modules.
- Mobile or AI moderation questions: use a module-local graph if one is added later; otherwise say the graph is missing and fall back to `rg` plus source browsing.

## OpenAPI

- Treat `docs/openapi/healthlink-openapi.json` as the committed API contract when it exists, but never read the full file into context. Absolutely do not load or display the entire OpenAPI JSON.
- Query OpenAPI surgically with `rg` first: search by route fragment, HTTP method, controller/API keyword, DTO/schema name, `securitySchemes`, or `bearerAuth`, then read only the smallest relevant JSON section.

## Rules

- Follow the selected module's AGENTS.md for local graph query/path/explain, wiki/report reading, graph update, and module fallback rules.
- Fall back to `rg`/source browsing only after the relevant module graph is missing or does not answer the question. Do not invent graph context.

- Before marking any task complete, always invoke requesting-code-review or verification-before-completion skill.
