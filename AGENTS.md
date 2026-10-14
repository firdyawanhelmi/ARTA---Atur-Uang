# ARTA WORKSPACE — AGENT INSTRUCTIONS

## 1. PROJECT BOUNDARY

This workspace contains two separate projects:

```text
./ARTA-LAMA-REFERENCE/
./ARTA-BARU/
```

Roles:

```text
ARTA-LAMA-REFERENCE = READ-ONLY REFERENCE
ARTA-BARU           = TARGET IMPLEMENTATION
```

Actual workspace mapping (verified 13 Oct 2026, read-only check): the
reference folder on disk is `./ARTA-REFERENCE/` and the implementation
folder is `./ARTA-BARU/`; `./ARTA-LAMA-REFERENCE/` does not exist.
Every rule written for `ARTA-LAMA-REFERENCE/` applies equally to the
actual `./ARTA-REFERENCE/`. Do NOT rename or move folders automatically;
a rename requires explicit user confirmation.

These rules are mandatory.

---

## 2. ABSOLUTE RULE — NEVER MODIFY OLD ARTA

`./ARTA-LAMA-REFERENCE/` is READ-ONLY.

The AI agent MUST NOT modify anything inside it.

DO NOT:

- edit files
- delete files
- rename files
- move files
- create files
- refactor code
- format code
- install or update dependencies
- change configuration
- change environment files
- change assets
- change HTML/CSS/JavaScript
- change Firebase configuration
- change service worker
- change database code
- change authentication code
- change synchronization code
- change deployment files
- change documentation

If the reference project appears to need a change, STOP and report it. Do not modify it.

---

## 3. ALLOWED USE OF OLD ARTA

The old project may ONLY be inspected and read as a reference for:

- UI/UX
- layout
- responsive behavior
- navigation
- feature flow
- form behavior
- interactions
- CSS
- JavaScript behavior
- copy/text
- icons/assets
- tutorials
- page structure

Reading old code does NOT authorize copying its architecture.

---

## 4. OLD ARTA MUST NEVER BE A RUNTIME DEPENDENCY

`ARTA-BARU` MUST NOT depend on `ARTA-LAMA-REFERENCE`.

Never create:

- imports
- aliases
- symlinks
- filesystem dependencies
- package dependencies
- build dependencies
- runtime dependencies
- asset dependencies
- script dependencies

from the new project to the old project.

The new project must contain its own implementation.

---

## 5. INDEPENDENCE REQUIREMENT

If this directory is completely removed:

```text
./ARTA-LAMA-REFERENCE/
```

`ARTA-BARU` must still be able to:

- install dependencies
- start development server
- build
- run tests
- run frontend
- run backend
- deploy

---

## 6. TARGET PROJECT

All implementation changes MUST be inside:

```text
./ARTA-BARU/
```

Before modifying any file, verify that the path belongs to `ARTA-BARU`.

If the target path is inside:

```text
./ARTA-LAMA-REFERENCE/
```

STOP.

---

## 7. PRD AUTHORITY

The approved master PRD is the Single Source of Truth for the new ARTA.

Expected location:

```text
./ARTA-BARU/PRD/ARTA-MASTER-PRD.md
```

Actual locations (verified): `./ARTA-MASTER-PRD.md` and
`./ARTA-TASK-ROADMAP.md` at the workspace root. If stored elsewhere, use
the approved PRD location provided by the user.

Priority:

```text
1. Security / Financial Integrity
2. Explicit PRD decisions
3. Business rules
4. ARTA UI/UX reference
5. Existing old ARTA behavior
6. AI agent assumptions
```

If old ARTA behavior conflicts with the PRD:

```text
PRD WINS.
```

---

## 8. DO NOT COPY LEGACY ARCHITECTURE

Do NOT blindly copy:

- Firebase (any product/SDK, including hidden FCM dependencies)
- Firestore
- Firebase Realtime Database
- Firebase Authentication
- Firebase Cloud Functions
- Firebase Cloud Messaging
- Firebase Analytics / Crashlytics / App Check
- legacy synchronization
- legacy conflict resolution
- legacy service worker
- legacy notification backend
- legacy database architecture
- legacy security assumptions

The new architecture is defined by the PRD.

---

## 9. NEW ARTA STACK

Frontend (native app, NOT web/PWA):

- React Native
- TypeScript
- Expo + EAS Build (Android/iOS binaries, store distribution)
- Expo Router or equivalent typed navigation
- Expo SQLite as primary local relational database
- Expo SecureStore (Keychain/Keystore-backed) for credentials

Backend:

- Laravel
- Laravel API
- Laravel Sanctum (token-based mobile auth)
- Laravel Queue
- Laravel Scheduler
- Laravel Reverb

Database:

- Server: MySQL 8+ (authoritative financial database)
- Device: SQLite via Expo SQLite (offline materialized state, op queue)

Realtime:

- Laravel Reverb / WebSockets (active-app transport only, NOT source of truth)

Push (NO Firebase/FCM — absolute ban, see §10):

- iOS: direct APNs integration from Laravel backend; APNs credentials in
  server secret management only, never in repo or client bundle
- Android baseline (guaranteed): local notifications from synced data +
  in-app notification history; NO promise of server push while app is
  closed/suspended without FCM
- UnifiedPush: OUT OF initial scope; only via separate explicit decision
- WebSockets MUST NOT be treated as OS-push replacement when suspended

Vite, IndexedDB, Service Worker, Web Push/VAPID are NOT active app
architecture. Those names appear in this document ONLY as prohibitions,
history, or audit findings.

Firebase is NOT part of the new ARTA. Banned in full: Firebase Auth,
Firestore, Realtime Database, Cloud Functions, Firebase Cloud Messaging
(FCM), Firebase Analytics, Crashlytics, App Check, and every other
Firebase SDK/service. Do NOT use another service that secretly depends
on FCM.

---

## 10. FORBIDDEN FEATURES

Do not add outside-scope features without explicit approval.

Explicitly excluded:

- Firebase (all products/SDKs/services, no hidden FCM dependency)
- Firestore
- Firebase Realtime Database
- Firebase Authentication
- Firebase Cloud Functions
- Firebase Cloud Messaging
- Firebase Analytics
- Firebase Crashlytics
- App Check
- OCR
- receipt scanning
- receipt/photo evidence
- PIN authentication
- biometric authentication
- generic AI chatbot
- unnecessary AI features
- AI-generated financial decisions

---

## 11. FINANCIAL INTEGRITY

Financial integrity is the highest-priority engineering requirement.

If financial state is uncertain:

```text
STOP.
DO NOT GUESS.
```

Never silently:

- overwrite financial data
- delete financial data
- duplicate financial operations
- alter balances incorrectly
- discard pending operations
- restore stale state over newer state

---

## 12. SERVER AUTHORITY

The server is authoritative for committed financial state.

The client is a local materialized representation.

Do NOT use:

- `Date.now()` as financial conflict authority
- Last Write Wins
- client balance as final authority
- client ownership as authority
- client authorization as authority

---

## 13. OFFLINE / SYNC

Offline mutation flow (native, SQLite):

```text
Native UI
→ local validation
→ SQLite (Expo SQLite) atomic write: entity change + operation queue row
→ operation_id
→ pending queue
→ immediate UI update
```

Every mutation requires a stable `operation_id`.

The same operation_id is reused for retries.

The backend must be idempotent.

Logout / pending policy (B5 — DECIDED, detail di PRD):

- Logout revokes server session + clears local credentials; NEVER deletes
  server financial data on plain logout.
- With pending ops: warn + offer to sync first; NEVER discard silently.
- Forced logout keeps the pending queue + required local data in a locked,
  account-isolated local partition; resume via safe reconciliation after
  the SAME account logs back in.
- On account switch the new account MUST NOT read/mutate/sync the prior
  account's data or queue. All queries + sync ops are authenticated-account
  scoped.
- No "discard entire pending queue" button without separate product
  decision + explicit approval. Account deletion is a separate flow.
- SQLite is NOT automatically encrypted: evaluate local DB encryption, key
  storage, Expo/native compatibility, and recovery BEFORE production; do
  NOT claim encryption until verified.

---

## 14. REALTIME

Laravel Reverb is transport only.

It is NOT the source of truth.

Authority hierarchy:

```text
Server DB
↓
Server revision / change feed
↓
Operation result
↓
Client SQLite
↓
Native UI
```

Reverb reconnect must trigger reconciliation when required.

Missed events must be recoverable.

Android notification baseline (B1 — DECIDED): guaranteed = local
notifications from synced data + in-app history. NO promised server push
to Android while closed/suspended. UnifiedPush OUT OF initial scope
(separate decision only). iOS uses direct APNs from Laravel (credentials
server-side only). WebSockets are NOT an OS-push substitute.

---

## 15. FINANCIAL OPERATIONS

Financial operations must be atomic.

Examples:

- income
- expense
- transfer
- target contribution
- debt payment
- receivable receipt
- transaction edit
- transaction delete
- financial restore

Use database transactions.

Balance-changing operations require appropriate row locking and server-side revalidation.

---

## 16. SECURITY

Every API endpoint must enforce server-side authorization.

Never trust client-provided `user_id`.

Never use:

```php
$request->all()
```

for sensitive mass assignment.

Use:

- Policies
- Form Requests
- explicit allowlists
- API Resources

Never expose:

- SQL errors
- stack traces
- filesystem paths
- secrets
- credentials

Ownership derives from auth context; scope every query + sync op to the
authenticated account (no cross-account read/mutate/sync). Store
auth/session secrets ONLY in platform-secure storage
(Keychain/Keystore-backed SecureStore), never in SQLite, prefs files,
logs, or the repo.

---

## 17. UI/UX

The old ARTA UI/UX is the visual and interaction reference.

Do not broadly redesign it unless explicitly instructed.

Target visual direction:

```text
MONOCHROME / Pro Max
```

Use:

- black
- gray
- white
- solid surfaces
- restrained semantic accents

Avoid:

- gradients
- excessive blur
- heavy backdrop-filter
- excessive glassmorphism
- generic SaaS dashboard patterns
- decorative AI UI
- Gemini/sparkle icons
- emoji as structural icons
- meaningless animations
- excessive cards
- unnecessary badges

---

## 18. RESPONSIVENESS

ARTA must be responsive on all devices.

Minimum test widths:

```text
320px
360px
390px
430px
768px
1024px
1280px
1440px
1920px+
```

Also test intermediate widths.

There are no excluded device sizes.

---

## 19. ACCESSIBILITY

Maintain:

- semantic HTML
- keyboard navigation
- visible focus
- accessible labels
- modal focus handling
- Escape behavior
- sufficient contrast
- screen-reader-friendly controls

---

## 20. CHANGE DISCIPLINE

Before changing code:

1. inspect the implementation
2. identify the actual cause
3. identify affected files
4. understand dependencies
5. make the smallest safe change
6. run relevant tests
7. review the diff

Do not make speculative refactors.

Do not clean up unrelated code.

Do not redesign unrelated pages.

Every changed file must have a clear reason.

---

## 21. REFERENCE AUDIT WORKFLOW

For parity work:

```text
1. Inspect ARTA-LAMA-REFERENCE
2. Understand relevant feature/UI behavior
3. Compare against PRD
4. Determine authoritative behavior
5. Implement ONLY in ARTA-BARU
6. Verify parity
7. Verify PRD compliance
```

The old project must remain untouched.

---

## 22. FEATURE PARITY

Use this conceptual matrix:

```text
Legacy Feature
Legacy Behavior
UI/UX Reference
New Requirement
New Implementation
Offline
Realtime
Security
Tests
```

Feature parity means preserving approved functionality and experience.

It does NOT mean copying legacy implementation.

---

## 23. DATA MIGRATION

There is no automatic legacy-data migration.

If migration is required later:

```text
Parser
→ Mapping
→ Validation
→ Preview
→ Explicit Confirmation
→ Import
→ Reconciliation
```

Never directly inject legacy data into production.

---

## 24. TESTING

Required testing:

- unit
- component
- domain
- API integration
- synchronization
- realtime
- security
- E2E
- responsive
- accessibility
- production smoke tests

Critical financial and sync edge cases must be covered.

---

## 25. REQUIRED SYNC TESTS

At minimum:

- offline create
- offline edit
- offline delete
- delete while another device is offline
- concurrent edits
- concurrent financial operations
- duplicate request
- timeout after server commit
- Reverb disconnect
- missed events
- cursor gap
- tombstone
- restore
- insufficient balance offline
- insufficient balance server-side
- crash during local write
- crash during sync
- network flapping
- simultaneous multi-device mutations
- full reconciliation after local DB reset

---

## 26. GIT

Never commit:

- secrets
- credentials
- `.env`
- private keys
- unnecessary generated artifacts
- temporary files

Prefer focused commits.

Do not mix unrelated changes.

---

## 27. EXECUTION DISCIPLINE

When implementing a task:

1. Read the relevant PRD section.
2. Inspect relevant new-project code.
3. Inspect old reference only when UI/UX/legacy behavior is relevant.
4. Never modify the old reference.
5. Implement only in ARTA-BARU.
6. Run relevant tests.
7. Review changed files.
8. Confirm no out-of-scope files changed.

If ambiguity can affect financial integrity:

```text
STOP AND ASK.
```

---

## 28. FILESYSTEM SAFETY CHECK

Before EVERY modification:

```text
Does the target path belong to ./ARTA-BARU/ ?
```

If YES:

```text
Proceed only if the change is otherwise in scope.
```

If NO:

```text
STOP.
```

Especially:

```text
./ARTA-LAMA-REFERENCE/
```

must always be treated as read-only.

---

## 29. FINAL INDEPENDENCE CHECK

Before declaring completion, verify:

1. `ARTA-REFERENCE/` (actual; `ARTA-LAMA-REFERENCE/` canonical) was not modified.
2. No source imports from `ARTA-REFERENCE/` / `ARTA-LAMA-REFERENCE/`.
3. No build configuration references it.
4. No runtime asset references it.
5. No package dependency references it.
6. New ARTA builds without it.
7. New ARTA tests without it.
8. New ARTA runs without it.
9. New ARTA uses its own backend.
10. New ARTA uses its own database.
11. New ARTA uses its own authentication.
12. New ARTA uses its own native notification system (APNs direct for iOS,
    local + in-app baseline for Android) instead of Firebase/FCM.
13. New ARTA uses its own SQLite/Expo SQLite local store (no
    IndexedDB/Service Worker/Web Push/VAPID as active architecture).
14. No legacy Firebase dependency remains.

---

## 30. STOP CONDITIONS

The agent MUST STOP rather than assume when:

- a financial rule is unclear
- PRD requirements conflict
- a change could cause financial inconsistency
- conflict resolution is unsafe
- ownership is ambiguous
- a requested change targets the old reference project
- the requested change would require modifying the old reference
- intended behavior cannot be determined
- a destructive migration is discovered

Do not silently choose a financial rule.

---

# 31. FINAL MANDATORY DIRECTIVE

You are building a NEW ARTA.

The old ARTA is NOT the application being modified.

The old ARTA is a READ-ONLY REFERENCE.

```text
./ARTA-LAMA-REFERENCE/
    ↓
    READ ONLY
    ↓
    UI/UX + FEATURE + BEHAVIOR REFERENCE

./ARTA-BARU/
    ↓
    READ + WRITE
    ↓
    NEW ARTA IMPLEMENTATION
```

NEVER modify the old project.

NEVER make the new project depend on the old project.

NEVER copy the old Firebase architecture.

NEVER use legacy synchronization as financial authority.

NEVER silently overwrite financial data.

NEVER use Last Write Wins for financial conflicts.

NEVER trust client-side financial state as server authority.

NEVER introduce AI slop.

NEVER make unrelated changes.

ALWAYS follow the approved PRD.

ALWAYS prioritize security and financial integrity.

ALWAYS keep the new ARTA independently buildable.

If uncertain about financial behavior:

```text
STOP.
DO NOT GUESS.
```

# END OF AGENTS.md
