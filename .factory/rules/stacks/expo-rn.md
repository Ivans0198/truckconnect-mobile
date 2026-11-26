# Stack profile: expo-rn (Expo + React Native + TypeScript)

Clean code standards for an Expo app with Expo Router, TanStack Query and an
API client generated from OpenAPI. `factory.json` → `stack` names the profile
a project uses. The `code-reviewer` subagent checks against them: breaking a
rule marked **(mandatory)** is a `Major` finding and blocks `APPROVED`; the
other rules are soft, and breaking one is `Minor`.

This profile is written for TruckConnect Driver, so some rules name its files
(`src/api/schema.d.ts`, `design-system.md`, `.maestro/`). The product rules
behind several of them live in `docs/CLAUDE_MOBILE.md`.

## General TypeScript

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

## Expo and React Native

- **Packages (mandatory):** add them with `pnpm exec expo install <pkg>`, never
  a bare `pnpm add`, so the version matches the SDK. Every import is declared
  in `package.json` (lint enforces it with `import/no-extraneous-dependencies`).
  Never import a devDependency from `app/` or `src/` outside tests.
- **SDK version:** the project is on Expo SDK 58. Read the docs pinned to it
  (`https://docs.expo.dev/versions/v58.0.0/...`), not `latest`. Moving to
  another SDK is its own ticket, done with the `expo:expo-upgrade` skill.
- **Native projects (mandatory):** `android/` and `ios/` are generated
  (Continuous Native Generation) and gitignored. Native configuration goes in
  `app.json` and config plugins, never as a hand edit under `android/`.
- **Development build (mandatory):** nothing may depend on Expo Go. Code that
  needs a native module assumes the development build.
- **Routing:** screens live in `app/` (Expo Router, file-based) and stay thin:
  they compose components and hooks from `src/`. Logic, data access and
  formatting go in `src/`, where jest can test them without a router.
- **Styles (mandatory):** colors, spacing, radius, font families and font
  sizes come from `src/theme/tokens.ts`. No raw hex, no magic pixel values in
  a component. With Inter, the weight is the family (`fontFamily.semibold`);
  `fontWeight` on custom fonts is a defect.
- **Driver ergonomics (mandatory):** every pressable is at least
  `TOUCH_TARGET_MIN` (60) tall and wide; any text the driver must read is at
  least 16. A screen with a target or an instruction below that is a `Major`.
- **Accessibility (mandatory):** every `Pressable` that acts as a button has
  `accessibilityRole="button"` and a readable name; icon-only controls have
  `accessibilityLabel`. A status that changes without the driver acting uses
  `accessibilityLiveRegion`. Never convey a state by color alone.
- **Components:** before a community UI library, check whether `@expo/ui` or
  a React Native built-in covers it. Whatever the source, the result must
  match the screen's mockup in `docs/mockups/` and the tokens in
  `design-system.md`: **the mockups win** over any platform styling advice.
  Large lists use `FlatList` (or FlashList), never a mapped `ScrollView`.
- **Platform code:** split by file (`thing.native.ts` / `thing.web.ts`) when
  the platforms really differ, not with `Platform.OS` branches scattered
  through a component. A native-only module (camera, location, signature,
  secure store) gets a `.web.ts` stub so Expo web, Playwright and the
  ui-reviewer can still render the screen.

## Data and the API

- **The contract (mandatory):** every request goes through the typed client
  in `src/api/client.ts`. Request and response types come from
  `src/api/schema.d.ts` (`paths[...]`, `components["schemas"][...]`), never
  written by hand. `schema.d.ts` is generated by `pnpm gen:api` and never
  edited. A path or field that is not in `docs/openapi.json` does not exist.
- **Server state (mandatory):** server data lives in TanStack Query, with
  query keys as `const` arrays next to their hook. It is never copied into
  component state or a store. Local UI state that outlives a screen goes in
  Zustand.
- **Errors (mandatory):** a query function throws on a non-2xx response; the
  screen renders the error state with Retry. A network failure never crashes
  the app and never shows a blank screen. A `429` means "try again shortly",
  never "discard the driver's input".
- **Secrets (mandatory):** tokens live in `expo-secure-store`, never in
  AsyncStorage, never in a log. Only `EXPO_PUBLIC_*` variables reach the
  bundle, and they are public: no secret goes in one.
- **Money and time (mandatory):** the API sends cents (`*Cents`) and UTC.
  Convert to AUD and to `Australia/Melbourne` only at the presentation edge,
  with one shared formatter, never inline in a component.
- **Offline (mandatory where it applies):** a status change, a POD or an
  incident created without signal is queued and synced later, and the screen
  shows it as pending sync. Losing one silently is a `Blocker`.
- **Uploads:** the presigned URL flow (ask for the URL, `PUT` the bytes with
  no Bearer token, then register). An expired URL is re-requested, not
  treated as a failure.

## Native behavior and permissions

- **Permissions (mandatory):** ask in context, after a screen explains why,
  never all at launch. Every denied state has a usable screen.
- **Background location:** tolerate batched fixes (several positions at
  once, irregular intervals); send them as a batch. Stop tracking when the
  run ends. No code may assume a fixed interval between fixes.

## Tests

- **jest (mandatory):** screens are tested through Testing Library queries by
  role and visible text, as the driver sees them, never by `testID` when a
  role or text exists. HTTP is mocked with msw handlers on the contract's
  paths (`src/test/server.ts`), never by mocking the client module. A request
  without a handler fails the test on purpose: do not loosen that.
- **Async rendering:** `render` and `fireEvent` are async in Testing Library
  v14: always `await` them, and wait for final states with `findBy*`. A
  test that sleeps is a defect.
- **Maestro (mandatory when native):** a story that touches something native
  (permissions, camera, location, notifications, the offline queue) adds or
  updates its flow in `.maestro/`. Its first assertion is on text only that
  screen has. The PR says a person must run `pnpm e2e:android`, and never
  claims the flow passed unless it was run.
