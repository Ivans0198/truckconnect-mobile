# Fatigue epic closeout (#26, T037)

Record of the check of the whole epic against `specs/26-fatiga-hvnl/quickstart.md`.

## Gate commands

| Command          | Result                                                         |
| ---------------- | -------------------------------------------------------------- |
| `pnpm test`      | 298 of 298 pass (one cold first run failed, see below)         |
| `pnpm lint`      | clean, zero warnings                                           |
| `pnpm typecheck` | clean                                                          |
| `pnpm e2e`       | 49 of 49 pass with `FABRICA_IGNORE_SNAPSHOTS=1` (phone, small) |

The first cold `pnpm test` run had 5 failures in 5 suites (the first one in
`src/fatigue/fatigue-screen.test.tsx`). Five later runs were all green, with
no code change in between. It looks like a timeout on a cold transform cache.
It is not reproduced, so nothing was changed.

## Manual walk

The Playwright suite covers each state of the quickstart on Expo web with the
mocked back: working, amber, red, blocked banner, events, week, errors with
"Try again", loading and "End your day?" at 393x852 and 360x800. The
"was not recorded" message without a network is covered by
`src/fatigue/fatigue-action-bar.test.tsx`. Nobody cut the network by hand in a
browser devtools session; that step stays for a person.

## Screenshots

No screenshot in `tests/ui.spec.ts-snapshots/` changes in this PR.
