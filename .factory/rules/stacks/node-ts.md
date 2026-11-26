# Stack profile: node-ts (Node.js + TypeScript)

Clean code standards for this stack. `factory.json` → `stack` names the
profile a project uses. The `code-reviewer` subagent checks against them:
breaking a rule marked **(mandatory)** is a `Major` finding and blocks
`APPROVED`; the other rules are soft, and breaking one is `Minor`.

- **Naming:** intention-revealing names. Functions are verbs (`calculateTotal`),
  booleans read as predicates (`isValid`, `hasAccess`). No abbreviations except
  universal ones (`id`, `url`).
- **Functions:** small, one job. Soft limit ~30 lines; extract when a comment
  would be needed to separate sections. Max 3 positional params (use an
  options object beyond that). Prefer early returns / guard clauses over deep
  nesting.
- **Types (mandatory):** strict TypeScript. No `any` (use `unknown` +
  narrowing). Model domain concepts as types: discriminated unions over loose
  shapes with optional fields. Public functions have explicit return types.
- **Design principles:** SOLID where it genuinely improves the design, never
  as box-ticking. KISS: the simplest solution that correctly solves the
  problem. YAGNI: no speculative abstractions, config, or extension points
  for hypothetical future needs. Build what the ticket asks.
- **Magic values (mandatory):** no unexplained literals scattered in logic.
  Name constants meaningfully (`MAX_LOGIN_ATTEMPTS = 5`, not a bare `5`).
- **Errors (mandatory):** never swallow errors. Catch only where you can
  handle or add context. Fail fast with clear messages. No error-silencing
  `|| {}` / `?.` chains that hide bugs.
- **State & purity (mandatory):** no mutation of shared state; prefer `const`
  and immutable updates. Prefer pure functions; isolate side effects at the
  edges.
- **Duplication:** rule of three (extract on the third occurrence, not the
  second). Do not create speculative abstractions.
- **Comments (mandatory):** code explains _what_, comments explain _why_.
  Delete commented-out code (git remembers it).
- **Dependencies (mandatory):** no new runtime dependency without a one-line
  justification in the PR description.
- **Tests (mandatory):** Arrange-Act-Assert, one behavior per test,
  descriptive names (`"returns empty list when user has no orders"`). Test
  behavior, not implementation details.
