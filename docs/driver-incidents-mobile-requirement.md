# Driver incident reporting — requirement for the mobile app

Written to be pasted into the mobile app's prompt, which has neither this
requirement nor a mockup for it.

Everything below is checked against `docs/openapi.json` (78 paths, 89
operations), which is the same file the admin panel generates its client from.
**If a field is not in this document and not in that spec, it does not exist.**

---

## Why this exists

The incidents module was scoped, built on the backend, and built in the admin
panel — and the half that starts the whole thing, the driver filing the report,
was never specified anywhere. The original ask says it plainly:

> "Un driver entra en la app mobile y registra un incidente… el admin será
> notificado en la plataforma web, allí ver la fecha de creación, el título del
> incidente, el conductor y su orden, y el estado del ticket."

The admin side of that sentence shipped. The mobile side is this document.

**There is no mockup**, unlike the six admin screens. The screen descriptions
below are the specification; follow the mobile app's existing visual language
rather than inventing one for these three screens.

---

## What the driver is doing

Something went wrong on the road and they are telling the office about it, from
where it happened. That framing decides most of the design:

- **They are standing next to the problem.** The form has to be completable
  one-handed, in bad light, possibly in the rain, possibly upset. Fewer fields,
  bigger targets, no multi-step wizard.
- **The photo is the point.** For a damaged pallet or a blocked gate, the
  picture carries more than the description ever will. Taking one must be one
  tap from the form, not a separate flow.
- **It is filed as it happens.** There is no "when did this happen" field —
  `createdAt` is taken as the time of the event. If reports start being logged
  days later, that assumption breaks and the backend needs a new field. Do not
  work around it on the client by putting a date in the description.

An incident is **a ticket, not a note**: it has an author, a state, and
evidence. The driver writes it once and never edits it; what moves afterwards
is the status, and only an admin moves that.

---

## The three screens

### 1. Report an incident

The form. Reachable from wherever a driver would reach for it mid-run — the
active order, and somewhere always-available, because a breakdown on the way to
a pickup belongs to no order yet.

| Field | Required | Rules |
|---|---|---|
| **Title** | Yes | 3–120 chars. The driver's own words. This is what the admin queue lists, so the placeholder should invite a specific sentence, not a category. |
| **Reason** | Yes | One of eleven values, below. A picker, not free text. |
| **Other reason** | When reason is `OTHER` | 3–120 chars. See the note under "Field rules". |
| **Description** | Yes | 10–2000 chars. What happened. |
| **Order** | No | Must be an order the reporting driver actually has. Default to the active run when there is one; allow "no order". |
| **Evidence** | No | Photos or a PDF. Up to the size limit below. See "Uploading evidence". |

`reason` values, exactly:

```
VEHICLE_BREAKDOWN      TRAFFIC_ACCIDENT       LOAD_DAMAGE
LOAD_DISCREPANCY       SITE_ACCESS_DENIED     UNSAFE_SITE_CONDITIONS
EQUIPMENT_FAILURE      THEFT_OR_VANDALISM     INJURY_OR_MEDICAL
WEATHER_OR_ROAD        OTHER
```

Show them in the driver's language; send the enum value.

### 2. My incidents

A list of the driver's own reports, newest first, each showing the title, the
reason, the date filed and the current status. Paginated.

**A driver sees their own reports and nobody else's.** This is enforced in the
backend service rather than left to a query parameter, so do not send
`driverId` to scope it and do not rely on filtering client-side.

### 3. One incident

The report as filed, its evidence, and where it has got to: `OPEN`,
`IN_REVIEW`, `SOLVED`. Read-only.

There is **no acknowledgement step**. An incident is something the driver
wrote, unlike a warning, which would be something written about them — so
there is nothing for them to accept.

---

## The contract

Every call carries the JWT Bearer token. All four are rate-limited: handle
`429` as "try again in a moment", not as a failure worth discarding the draft
over.

### `POST /incidents` — file the report

```jsonc
{
  "title": "Gate locked at Braeside, nobody answering",  // required, 3–120
  "reason": "SITE_ACCESS_DENIED",                        // required, enum
  "reasonOther": null,                                   // when reason is OTHER
  "description": "Arrived 7:05, gate chained…",          // required, 10–2000
  "orderId": "…",                                        // optional, nullable
  "evidence": [                                          // optional
    {
      "fileKey": "…",                 // from the upload step
      "fileMimeType": "image/jpeg",
      "fileSizeBytes": 184320
    }
  ]
}
```

`driverId` exists on this endpoint but is **for an admin filing on behalf of a
driver**. A driver reporting their own incident does not send it.

Returns `201` with the created incident. Errors: `400` validation, `401` no
token, `403` not allowed (for example, an order that is not theirs), `404`
order or driver not found, `429` rate limited.

### `POST /incidents/upload-url` — get somewhere to put a photo

```jsonc
// request
{ "mimeType": "image/jpeg", "fileSizeBytes": 184320 }

// response
{ "uploadUrl": "https://…", "fileKey": "…", "expiresInSeconds": 900 }
```

### `GET /incidents` — my reports

`page` and `limit` are **required** query parameters — not defaulted, so a call
without them is a `400`. Optional filters: `status`, `reason`, `orderId`.

### `GET /incidents/{id}` — one report

Returns the incident with its `evidence[]` (each carrying a `downloadUrl`).

### Not for the mobile app

- `PATCH /incidents/{id}/status` — admin only. The driver does not close their
  own ticket.
- `PATCH /incidents/{id}/legal-hold` — admin only.

---

## Uploading evidence

Three steps, the same path the compliance documents already take. The file
goes **from the phone straight to the bucket** — it never passes through the
API.

1. `POST /incidents/upload-url` with the mime type and byte size. Get back a
   presigned URL and the `fileKey` that will name the file.
2. **`PUT` the bytes to `uploadUrl` directly.** No Bearer token on this
   request — it is a presigned URL to storage, not an API call.
3. `POST /incidents` with the `fileKey`, mime type and size in `evidence[]`.

Constraints, enforced on both ends:

| | Value |
|---|---|
| Accepted types | `image/jpeg`, `image/png`, `image/webp`, `application/pdf` |
| Max size | 10485760 bytes (10 MiB) per file |
| URL lifetime | 900 seconds (15 minutes) |

Two things this ordering implies, and both need handling:

- **The URL expires.** A driver who takes a photo, loses signal in a loading
  dock and comes back twenty minutes later has a dead URL. Request a fresh one
  rather than failing the report.
- **An uploaded file with no incident is orphaned.** Steps 1 and 2 can succeed
  and step 3 never happen. Prefer uploading when the driver submits rather than
  the moment they attach, so the window for orphans is as small as possible.

---

## Field rules worth stating twice

**`reasonOther` is conditional in both directions.** OpenAPI cannot express
"required only when another field has a particular value", so the spec marks it
optional. It is not. Checked against the backend's validator
(`incidents.service.ts`, `resolveReasonOther`), which enforces both halves:

| Reason | `reasonOther` | Result |
|---|---|---|
| `OTHER` | present | Accepted — it is the missing category's name |
| `OTHER` | empty or whitespace | `400` — *"reasonOther is required when reason is OTHER"* |
| anything else | present | `400` — *"reasonOther is only accepted when reason is OTHER"* |
| anything else | absent | Accepted |

The second rejection is the one that will catch a form out: a driver who picks
`OTHER`, types a reason, then changes their mind and picks `LOAD_DAMAGE` will
send a stale `reasonOther` and be rejected. **Clear the field when the reason
changes away from `OTHER`.** The backend refuses rather than silently dropping
it on purpose, so that a client sending it learns the field did nothing.

**The order must be the reporting driver's.** Checked in `validateOrder`: an
order that does not exist is a `404`, and one that exists but belongs to
another driver is a `403` — *"Drivers can only report incidents on their own
orders"*. Not a silent success either way. Populate the picker from the
driver's own orders and the case cannot arise.

**Nullable fields on the way back.** `title`, `description`, `reasonOther`,
`driver`, `orderId` and `orderNumber` are all nullable in `IncidentResponseDto`
— not because they were optional going in, but because of retention (below).
**A list that assumes `title` is a string will crash on an old incident.**

---

## What happens after it is filed

Worth knowing on the mobile side, because it explains fields the app displays.

- Every active admin is **notified in the panel the moment a report lands**.
- An admin works it `OPEN` → `IN_REVIEW` → `SOLVED`, and can reopen one closed
  too early. `reviewedAt` is when it was first picked up, `solvedAt` when it
  was closed.
- **The report is never edited.** Not by the driver, not by the admin.
- **Retention.** A nightly sweep clears an incident's personal payload once it
  has been closed for its full period: the words, the photos, the driver and
  the order link go; the reason, the dates and the state stay, so historical
  counts do not move. Two years for an ordinary report, seven for anything
  touching somebody's health. `redactedAt` marks a cleared record, and
  `legalHold` marks one that is never swept.

That last point is why the nullable fields above exist. **A driver looking back
at a report from three years ago will see a stub**, and the mobile app should
say so — "This report's details were cleared under the retention policy" — not
render an empty card.

---

## Deliberately out of scope

- **Performance notes and warnings.** These were dropped when the incidents ask
  replaced the original "driver notes" one. An admin's assessment of a person
  over time is not the same object as a driver's report of an event, and
  merging them was the weakness of the original ask. If they are wanted they
  are a separate model and their own scoping conversation.
- **Editing or deleting a filed report.** Not supported, by design.
- **Chat on an incident.** There is no comment thread in the contract.

---

## Open questions for whoever builds this

1. **Offline.** A breakdown is exactly the situation with no signal. Does the
   app queue a report and send it when the connection returns? Nothing in the
   contract prevents it, and nothing in the contract helps — it is entirely a
   client concern, and it changes the shape of the form's state handling.
2. **Where does reporting live in the navigation?** It must be reachable
   without an active order, which rules out putting it only inside the run.
3. **How many photos?** Per-file size is capped; the number of files in
   `evidence[]` is not. Pick a sane limit on the client.
