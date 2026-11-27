---
description: "Tasks for epic #54: Compliance, perfil y notificaciones"
---

# Tasks: Compliance, perfil y notificaciones

**Input**: Design documents from `/specs/54-compliance-perfil/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: MANDATORY (constitution, principle I). Every user story has its own "Tests for User Story N" section, listed before its implementation tasks. The tests are written first and confirmed failing. In Foundational too, a task that writes logic comes after the task that writes its failing test.

**Organization**: Tasks are grouped by user story so each one is built, tested and merged in its own pull request.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 to US5)

## Shared files

Several stories need the same wiring. To keep stories that run in parallel
from editing the same file, that wiring lives in Foundational:

- `src/test/server.ts` (default handlers), `src/format/time.ts` (every
  formatter), `app/_layout.tsx` (the two new routes) and `tests/ui.spec.ts`
  (helpers moved to `tests/support/app.ts`) are only edited in Foundational.
- Each story writes its Playwright tests in its own file
  (`tests/<story>.spec.ts`). The visual workflow runs every spec file.
- Home is split in two files: `app/(tabs)/index.tsx` (US3 adds the banner)
  and `src/home/home-header.tsx` (US5 adds the bell).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the one dependency the shared upload helper needs.

- [ ] T001 Install `expo-file-system` with `pnpm exec expo install expo-file-system`, which updates `package.json` (research R5: reads the picked file as a `Blob` for the upload `PUT`); record the one-line justification for the PR

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: fixtures, default handlers, formatters, the attention summary, the documents query, the upload helper, the new routes and the shared Playwright helpers.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 [P] Write typed fixtures with `components["schemas"]`: `src/test/compliance-fixtures.ts` (a document for each case of data-model.md → Attention: 61, 60, 8, 7 and 0 days, past expiry, `EXPIRED`, `PENDING_REVIEW` over a red approved one, `REJECTED` with `rejectionReason`, two versions of one type), `src/test/profile-fixtures.ts` (stats `period: "month"`, one active and one inactive vehicle), `src/test/notification-fixtures.ts` (read and unread, two pages of 20)
- [ ] T003 Add happy default handlers to `src/test/server.ts` for `GET /compliance/documents` (empty `items`, `totalPages: 1`), `GET /drivers/:id/stats`, `GET /vehicles` and `GET /notifications` (empty, `total: 0`), so screens that now ask for them keep passing; tests override them with `server.use()`
- [ ] T004 [P] Write failing tests in `src/format/time.test.ts` for `melbourneDaysUntil(expiryDate, now)` (0 on the expiry day, negative after, Melbourne midnight not UTC), `formatMelbourneDate` ("14 Mar 2028"), `formatTimeLeft` ("in 1y 10m", "in 6m", "in 32 days", "today"), `formatTenure` ("New" under a month, "8mo", "1y 2mo") and `formatNotificationTime` ("9:41 AM" today, "Yesterday", "12 Nov")
- [ ] T005 Implement those formatters in `src/format/time.ts` with `Intl` and `Australia/Melbourne`, no new dependency (research R13)
- [ ] T006 [P] Write failing table tests in `src/compliance/attention.test.ts` for `summarizeDocuments(documents, now)`: one card per `docType` in contract order, `latest` by `createdAt`, `current` = latest `APPROVED` or `EXPIRED`, every row of the data-model.md transition table, an `APPROVED` past its date is `expired`, `needsAttention` and `blocksAcceptance` per data-model.md, `attentionCount`, and `mostUrgent` (expired first, then fewest days)
- [ ] T007 Implement `src/compliance/types.ts` (contract aliases, English names per `DocType`, `ATTENTION_FROM_DAYS = 60`, `URGENT_FROM_DAYS = 7`) and `src/compliance/attention.ts` until T006 passes (research R2)
- [ ] T008 [P] Write failing tests in `src/compliance/queries.test.ts` with msw: the request sends `page=1` and `limit=100`, a non-2xx throws, `totalPages > 1` throws a named error, and `useComplianceAttention()` returns the summary, or `undefined` while loading or after a failure
- [ ] T009 Implement `src/compliance/queries.ts` (`COMPLIANCE_DOCUMENTS_KEY = ["compliance", "documents"]`, `DOCUMENTS_PAGE_LIMIT`, fetcher, `useComplianceDocuments`, `useComplianceAttention`) until T008 passes
- [ ] T010 [P] Write failing tests in `src/uploads/presigned-upload.test.ts` with msw, the `PUT` going to `https://uploads.test/...`: asks for the URL with the file size, the `PUT` has no `Authorization` and has `Content-Type` = `mimeType`, returns `fileKey` and `fileSizeBytes`; an expired URL (fake clock past `expiresInSeconds`) and a `403` on the `PUT` each ask for a new URL once; a second `403` is `rejected`; no network is `offline`; `429` is `rate-limited`; every failure is an `UploadError` with its `stage` (contracts/uploads.md)
- [ ] T011 Implement `src/uploads/read-file.ts` (`File` from `expo-file-system`), `src/uploads/read-file.web.ts` (`fetch(uri).blob()`) and `src/uploads/presigned-upload.ts` (`uploadWithPresignedUrl`, `UploadError`, `isUploadError`) until T010 passes (research R4, R5)
- [ ] T012 Move the Home title into `src/home/home-header.tsx` and compose it from `app/(tabs)/index.tsx` (same "Home" heading, existing tests unchanged), and declare `documents/new` (modal) and `notifications` inside the session's `Stack.Protected` in `app/_layout.tsx`, with placeholder screens `app/documents/new.tsx` and `app/notifications.tsx` built on `TitleScreen` (contracts/routes.md)
- [ ] T013 Move the shared Playwright helpers from `tests/ui.spec.ts` to `tests/support/app.ts` (sign-in routes, `fulfill`, screenshot and axe helpers) and add default `page.route` answers for `/compliance/**`, `/drivers/*/stats`, `/vehicles**` and `/notifications**` (empty lists); `tests/ui.spec.ts` imports them and its tests stay as they are

**Checkpoint**: `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm e2e` green. User stories can start.

---

## Phase 3: User Story 1 - Ver mis documentos y cuál pide atención (Priority: P1) 🎯 MVP

**Goal**: the Docs tab is mockup 13: one card per document type with its traffic light, the attention banner on top and "How alerts work".

**Independent Test**: with a mocked back returning documents in every state, Docs shows each card with its label, colour and CTA, and the banner with the most urgent one.

### Tests for User Story 1 (MANDATORY, write first) ⚠️

- [ ] T014 [P] [US1] Write failing tests in `src/compliance/document-card.test.tsx`: names in English ("Driver Licence", "Vehicle Registration", "Public Liability", "Trailer Registration", "Dangerous Goods"); "Expires" with the Melbourne date and "in 1y 10m"; "Valid"; amber "32 days" with "Action needed" and "Upload renewed document"; red "7 days" and "Expired" with the CTA; "Under review" with no CTA, still showing the red expiry when `current` is red; "Rejected" with the reason and "Upload again"; the state is in text, never colour alone; no text under 16
- [ ] T015 [P] [US1] Write failing tests in `src/compliance/compliance-screen.test.tsx` with msw: "1 document needs attention" with "Public Liability expires in 32 days. Renew before 17 Jun 2026 to avoid being blocked from new orders."; no banner when nothing needs attention; "How alerts work" with 90/60/30/14/7; the empty state; the loading skeleton; the error with "Try again" that retries; refresh on tab focus and on pull-to-refresh; the CTA opens `/documents/new?type=<DocType>` and "+" (accessible name "Add document") opens `/documents/new`
- [ ] T016 [P] [US1] Write `tests/compliance.spec.ts`: Docs with valid documents, with attention, empty and with the error, in both viewports, plus axe on each

### Implementation for User Story 1

- [ ] T017 [P] [US1] Implement `src/compliance/document-card.tsx` with tokens from `src/theme/tokens.ts` and the `semantic` tones (amber border on `expiring`, red on `urgent` and `expired`) until T014 passes
- [ ] T018 [P] [US1] Implement `src/compliance/attention-banner.tsx` (count and most urgent document, `accessibilityLiveRegion`)
- [ ] T019 [US1] Implement `src/compliance/compliance-screen.tsx` (header with "+", `ScrollView` with `RefreshControl`, banner, cards, "How alerts work", empty, skeleton, error) and compose it from `app/(tabs)/docs.tsx`, until T015 and T016 pass

**Checkpoint**: Docs works on its own; the CTAs lead to the placeholder form.

---

## Phase 4: User Story 2 - Subir la renovación de un documento (Priority: P1)

**Goal**: the document form: photo or file, issue and expiry dates, the three-step upload, and back to Docs with the document "Under review".

**Independent Test**: with a mocked back and storage, pick a file, fill the dates and submit; the app asks for the URL, uploads, registers, and Docs shows "Under review".

**Depends on**: US1 (the form opens from its cards and returns to its list).

- [ ] T020 [US2] Install `expo-image-picker`, `expo-document-picker` and `@react-native-community/datetimepicker` with `pnpm exec expo install` (research R6, R7) and add the `expo-image-picker` config plugin to `app.json` with `cameraPermission: "TruckConnect uses the camera to photograph your compliance documents."`; record the one-line justification for each in the PR and say a new development build is needed

### Tests for User Story 2 (MANDATORY, write first) ⚠️

- [ ] T021 [P] [US2] Write failing tests in `src/compliance/draft.test.ts` for `validateDraft`: each `DraftError` of data-model.md (`missing-type`, `missing-file`, `missing-issue-date`, `missing-expiry-date`, `expiry-not-after-issue`, `unsupported-file`) and an empty result for a complete draft
- [ ] T022 [P] [US2] Write failing tests in `src/compliance/document-form.test.tsx` with msw, replacing only `src/compliance/pick-file.ts` and the date dialog with `jest.mock`: `?type=PUBLIC_LIABILITY` comes chosen; without it the five types are offered first; "Take photo" shows the explanation before asking for the camera, then the preview; a denied permission explains the settings and keeps "Choose file"; "Choose file" shows the file name; invalid fields are marked and nothing is sent; "Submit" calls upload-url, `PUT` and `POST /compliance/documents` with `docType`, `issueDate`, `expiryDate` (`YYYY-MM-DD`), `fileKey`, `fileMimeType`, `fileSizeBytes`, then goes back with the list invalidated; a second tap sends nothing; progress is announced; a failure keeps the form with "Try again"; a `429` says "Too many requests. Try again shortly."; a `400` shows the back's `message`; buttons and date fields at least 60 tall and no text under 16
- [ ] T023 [P] [US2] Write failing tests in `src/mocks/dev-compliance-handlers.test.ts`: the dev mocks list a Public Liability document expiring in 32 days, the upload URL points to `${baseUrl}/__dev-uploads/<fileKey>`, the `PUT` there answers 200, and a registered document then appears as `PENDING_REVIEW` (research R15)
- [ ] T024 [P] [US2] Write `tests/document-form.spec.ts`: the form from a card and from "+", with validation errors, choosing a PDF through the browser file chooser, in both viewports, plus axe

### Implementation for User Story 2

- [ ] T025 [P] [US2] Implement `src/compliance/draft.ts` (`DocumentDraft`, `PickedFile`, `validateDraft`, the three allowed mime types) until T021 passes
- [ ] T026 [P] [US2] Implement the native boundaries: `src/compliance/pick-file.ts` (`launchCameraAsync` after `requestCameraPermissionsAsync`, `getDocumentAsync` with the three mime types, returns `PickedFile` or `cancelled`), `src/compliance/camera-rationale.tsx`, and `src/ui/date-field.tsx` (`DateTimePickerAndroid.open`, 60 tall, "Select date") with `src/ui/date-field.web.tsx` (`type="date"`)
- [ ] T027 [US2] Implement `src/compliance/submit-document.ts` (mutation: `uploadWithPresignedUrl` with `POST /compliance/documents/upload-url`, then `POST /compliance/documents`, then invalidate `COMPLIANCE_DOCUMENTS_KEY`) and `src/compliance/document-form.tsx`, and compose it from `app/documents/new.tsx`, until T022 and T024 pass
- [ ] T028 [US2] Implement the dev-build mocks for E5 in `src/mocks/` (documents in memory, upload-url, the `__dev-uploads` `PUT`, register; also stats, vehicles and notifications so the tabs load on the emulator), loaded only in a development build without `EXPO_PUBLIC_API_URL`, until T023 passes
- [ ] T029 [US2] Write `.maestro/compliance-upload.yaml`: sign in with the test driver, open Docs, tap "Upload renewed document" on Public Liability, tap "Take photo", see the explanation, allow the permission and reach the system camera; its first assertion is on text only Docs has. The PR says a person must run `pnpm e2e:android` before merging

**Checkpoint**: Docs and the form work end to end against mocks; the Maestro flow waits for a person.

---

## Phase 5: User Story 3 - Enterarme desde Home de que algo vence, y no aceptar órdenes con un documento en rojo (Priority: P2)

**Goal**: the compliance banner on Home, the dot on the Docs tab, and the compliance reasons in E4's order-acceptance rule.

**Independent Test**: with a document about to expire, Home shows the banner and Docs the dot; with an expired one, the rule says "no" with its reason and the Fatigue banner shows it.

### Tests for User Story 3 (MANDATORY, write first) ⚠️

- [ ] T030 [P] [US3] Write failing tests in `src/compliance/compliance-banner.test.tsx` with msw: amber "Public Liability expires in 32 days. Renew now to avoid being blocked from new orders."; red at 7 days or expired; "and N more" with several; "<Type> renewal under review. You can't accept new orders until it's approved." when the renewal is pending over a red one; an amber one under review no longer counts; tapping goes to `/docs`; nothing is drawn with no attention or when the query fails
- [ ] T031 [P] [US3] Write failing tests in `src/navigation/tab-bar.test.tsx`: with `tabBarBadge: true` Docs shows the amber dot and its accessible name ends with ", needs attention"; without it, no dot
- [ ] T032 [P] [US3] Update `src/fatigue/order-acceptance.test.ts` and `src/fatigue/acceptance-banner.test.tsx` first, so they fail: reasons as a discriminated union; `compliance` reasons for `expiring` (with days), `expired` and `under-review` from `DocumentCard.blocksAcceptance`; compliance after fatigue reasons, in `DocType` order; `compliance: undefined` adds nothing; `describeBlockReason` strings from contracts/order-acceptance.md ("Public Liability expires in 5 days", "expires today", "Driver Licence expired", "Public Liability under review"); the Fatigue banner lists a compliance reason with the fatigue ones
- [ ] T033 [P] [US3] Write `tests/compliance-banner.spec.ts`: Home with the amber and the red banner, the Docs tab dot, and the Fatigue banner with a compliance reason, in both viewports, plus axe

### Implementation for User Story 3

- [ ] T034 [P] [US3] Implement `src/compliance/compliance-banner.tsx` (`router.navigate("/docs")`, `accessibilityRole="button"`, 60 tall) and compose it from `app/(tabs)/index.tsx` under `HomeHeader`, until T030 passes
- [ ] T035 [P] [US3] Make `src/navigation/tab-bar.tsx` honour `options.tabBarBadge` and set it for `docs` in `app/(tabs)/_layout.tsx` from `useComplianceAttention()`, until T031 passes
- [ ] T036 [US3] Change `src/fatigue/order-acceptance.ts` (union reasons, `compliance` input, `describeBlockReason` replacing `ACCEPTANCE_BLOCK_MESSAGES`, `useOrderAcceptance` also reads the documents query) and `src/fatigue/acceptance-banner.tsx`, until T032 and T033 pass; the hook keeps its signature for E2

**Checkpoint**: the driver hears about an expiring document from Home, and the acceptance rule knows about compliance.

---

## Phase 6: User Story 4 - Ver mi perfil y cerrar sesión (Priority: P2)

**Goal**: the Profile tab is mockup 14, read only, without Preferences or Support.

**Independent Test**: with a mocked account, stats and vehicle, Profile shows each field; "Log out" still signs out as in E1.

### Tests for User Story 4 (MANDATORY, write first) ⚠️

- [ ] T037 [P] [US4] Write failing tests in `src/profile/profile-format.test.ts`: `initialsOf` ("David Chen" → "DC", one name → one letter), `licenceLabel` (`HR` → "Heavy Rigid (HR)", `HC` → "Heavy Combination (HC)", `MC` → "Multi Combination (MC)", another value → itself, `null` → nothing), `emergencyContactOf` (`name` and `phone` when they are strings, otherwise `null`)
- [ ] T038 [P] [US4] Write failing tests in `src/profile/queries.test.ts` with msw: stats call `/drivers/{id}/stats` with the account `id` and `period=month`; vehicles call `page=1&limit=100` and keep only `isActive`; non-2xx throws
- [ ] T039 [P] [US4] Write failing tests in `src/profile/profile-screen.test.tsx` with msw: initials, name, licence label and "ABN 12 345 678 901"; "Deliveries" with the month's `totalOrders`, "Rating" with the empty marker and "With us"; Email, Phone and Emergency contact or "Not set"; the vehicle with make, model, year, registration, "Semi-trailer", pallets, GVM in kg and cargo height in m; "No vehicle on file"; two active vehicles show two cards; refresh on tab focus and on pull-to-refresh; each section fails alone with "Try again"; no chevrons and no "Edit"; no "Preferences" and no "Support"; "TruckConnect Driver · v0.1.0"; "Log out" still there; missing optional fields never show "null"; no text under 16
- [ ] T040 [P] [US4] Write `tests/profile.spec.ts`: Profile with all data, without vehicle and with a section error, in both viewports, plus axe

### Implementation for User Story 4

- [ ] T041 [P] [US4] Implement `src/profile/profile-format.ts` until T037 passes
- [ ] T042 [P] [US4] Implement `src/profile/queries.ts` (keys `["profile", "stats", "month"]` and `["profile", "vehicles"]`) until T038 passes
- [ ] T043 [P] [US4] Implement `src/profile/profile-header.tsx` (avatar, name, licence, ABN, the three stats), `src/profile/personal-info.tsx` and `src/profile/vehicle-card.tsx`
- [ ] T044 [US4] Implement `src/profile/profile-screen.tsx` (sections with their own loading and error, `SignOutButton` of E1 at the end, version from `Constants.expoConfig?.version`) and compose it from `app/(tabs)/profile.tsx`, until T039 and T040 pass

**Checkpoint**: Profile works on its own; the `profile` baseline of `tests/ui.spec.ts` changes and the PR says so.

---

## Phase 7: User Story 5 - Leer mis notificaciones (Priority: P2)

**Goal**: the bell on Home with its unread dot, and the Notifications list with read, read all and pagination.

**Independent Test**: with a mocked back returning read and unread notifications, the bell shows the dot, the list shows them in order, and reading them clears the dot.

### Tests for User Story 5 (MANDATORY, write first) ⚠️

- [ ] T045 [P] [US5] Write failing tests in `src/notifications/queries.test.ts` and `src/notifications/mutations.test.ts` with msw: the list asks `page` and `limit=20` and stops at `totalPages`; the unread count asks `unread=true&limit=1` and reads `total`; reading one updates the cache at once and restores it if the `PATCH` fails; read all invalidates both keys
- [ ] T046 [P] [US5] Write failing tests in `src/notifications/notification-bell.test.tsx`: a red dot and the accessible name "Notifications, 3 unread"; no dot and "Notifications" with none; it opens `/notifications`; the count refreshes every minute while Home is focused (fake timers) and when the app comes back
- [ ] T047 [P] [US5] Write failing tests in `src/notifications/notifications-screen.test.tsx` with msw: newest first with title, body and Melbourne time ("9:41 AM", "Yesterday", "12 Nov"); unread ones highlighted in more than colour; tapping one marks it read; "Mark all read"; a failed read comes back unread with a message; the second page loads at the end; "You're all caught up"; skeleton and error with "Try again"; pull-to-refresh; long bodies are not cut; rows at least 60 tall and no text under 16
- [ ] T048 [P] [US5] Write `tests/notifications.spec.ts`: Home with the bell dot, the list with read and unread, and the empty list, in both viewports, plus axe

### Implementation for User Story 5

- [ ] T049 [P] [US5] Implement `src/notifications/queries.ts` (`NOTIFICATIONS_PAGE_SIZE = 20`, `UNREAD_REFRESH_MS = 60_000`, infinite list, unread count) and `src/notifications/mutations.ts` until T045 passes
- [ ] T050 [P] [US5] Implement `src/notifications/notification-bell.tsx` and add it to `src/home/home-header.tsx`, until T046 passes
- [ ] T051 [US5] Implement `src/notifications/notification-row.tsx` and `src/notifications/notifications-screen.tsx` (`FlatList` with `onEndReached`, "Mark all read", back arrow) and compose it from `app/notifications.tsx`, until T047 and T048 pass

**Checkpoint**: notifications work on their own; the `home` baseline changes and the PR says so.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T052 Check every request in `src/compliance/`, `src/profile/`, `src/notifications/` and `src/uploads/` against `specs/54-compliance-perfil/contracts/api-usage.md`, and run `specs/54-compliance-perfil/quickstart.md` end to end on Expo web
- [ ] T053 Add a short handoff for E2 to `docs/plan-maestro.md` under E2's row: the acceptance rule now carries compliance reasons (`describeBlockReason`), Home has `HomeHeader` and `ComplianceBanner` to build "Your day" around, and the upload helper lives in `src/uploads/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: after Setup. Blocks every story.
- **US1 (Phase 3)**: after Foundational.
- **US2 (Phase 4)**: after US1.
- **US3 (Phase 5)**, **US4 (Phase 6)** and **US5 (Phase 7)**: after Foundational, in parallel with US1 and with each other.
- **Polish (Phase 8)**: after all stories.

### Within Each User Story

- Tests first, confirmed failing.
- Pure functions before the components that use them; components before the screen; the route last.
- Commit every green step.

### Files more than one story touches

None in parallel. US1 and US2 both work in `src/compliance/` but on different files, and US2 waits for US1. `package.json` and `app.json` change in Setup and in US2, which are sequential.

### Parallel Opportunities

- In Foundational: T002, T004, T006, T008 and T010 (tests and fixtures in different files).
- After Foundational: US1, US3, US4 and US5 at the same time; US2 as soon as US1 merges.
- Inside each story, every task marked [P].

## Parallel Example: User Story 4

```text
T037 profile-format.test.ts   T038 queries.test.ts
T039 profile-screen.test.tsx  T040 tests/profile.spec.ts
then T041, T042, T043 together, then T044.
```

## Implementation Strategy

### MVP First

1. Setup and Foundational.
2. US1: the driver sees what is expiring.
3. US2: the driver renews from the app. With US1 and US2 the compliance problem is solved end to end.

### Incremental Delivery

US3, US4 and US5 add value one by one and can merge in any order. Each changes visual baselines (`home` with US3 and US5, `profile` with US4); the person accepts them from each PR's visual job.
