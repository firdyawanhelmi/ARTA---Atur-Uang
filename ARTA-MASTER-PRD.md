# ARTA --- MASTER PRODUCT REQUIREMENTS DOCUMENT (PRD)

**Project:** ARTA --- Personal Finance App for Teenagers\
**Document:** Master PRD\
**Status:** APPROVED — disetujui final oleh pengguna pada 13 Okt 2026 (persetujuan eksplisit dalam percakapan)\
**Target:** AI Coding Agent / Human Developer\
**Language:** Indonesian\
**Architecture:** React Native + TypeScript + Expo/EAS Build + SQLite offline-first + Laravel API + MySQL + Laravel Queue/Scheduler + Laravel Reverb/WebSockets + APNs (iOS) + local/in-app notifications; Android remote push without FCM is limited\
**Version:** 2.0\
**Date:** October 2026\
**Approval:** 13 Okt 2026 — persetujuan final eksplisit pengguna dalam percakapan\
**Review note:** This revision changes the product target from web/PWA to native Android/iOS. Approved as the Single Source of Truth; implementation may proceed per roadmap gates. The no-Firebase/no-FCM rule is absolute.\

------------------------------------------------------------------------

# 0. MANDATORY AGENT DIRECTIVE

This document is the **single source of truth** for the new ARTA
application.

The old ARTA project is a **REFERENCE PROJECT ONLY**.

## ABSOLUTE RULES

1.  **DO NOT MODIFY THE OLD ARTA PROJECT.**
2.  **DO NOT DELETE FILES FROM THE OLD ARTA PROJECT.**
3.  **DO NOT RENAME FILES IN THE OLD ARTA PROJECT.**
4.  **DO NOT REFACTOR THE OLD ARTA PROJECT.**
5.  **DO NOT INSTALL OR CHANGE dependencies inside the old ARTA
    project.**
6.  **DO NOT use the old ARTA project as a runtime dependency.**
7.  **DO NOT import JavaScript, CSS, HTML, Firebase code, database code,
    service workers, or backend logic from the old project into the new
    project as runtime dependencies.**
8.  The old project may only be:
    -   inspected,
    -   read,
    -   compared,
    -   used as a UI/UX reference,
    -   used as a feature reference,
    -   used to understand existing copy and interaction patterns.
9.  The new ARTA must build, test, and run if the old reference project
    is completely removed.
10. The new ARTA must have its own:
    -   frontend,
    -   backend,
    -   database,
    -   authentication,
    -   sync engine,
    -   native mobile storage and sync engine,
    -   notification system,
    -   deployment configuration.
11. **Firebase must not be used in the new ARTA.**
12. **Do not reproduce old architectural bugs merely for feature
    parity.**
13. When the old ARTA behavior conflicts with this PRD, **this PRD
    wins**.
14. When UI/UX reference conflicts with financial integrity or security
    requirements, **financial integrity/security wins**.
15. Never silently delete, overwrite, corrupt, or guess financial data.
16. Never invent missing requirements.
17. Do not introduce generic AI-generated UI patterns.
18. Do not introduce gradients, excessive blur, sparkle/Gemini-like
    branding, or unnecessary animations.
19. Do not add features outside this PRD without explicit approval.
20. Do not remove existing features from scope without explicit
    approval.

------------------------------------------------------------------------

# 1. PROJECT OVERVIEW

ARTA is a personal finance application designed for teenagers.

The product should feel like a serious, polished consumer finance
application while remaining simple and approachable.

ARTA is not a demo, toy project, dashboard template, or generic
AI-generated finance UI.

The target quality is:

-   production-ready,
-   secure,
-   financially consistent,
-   offline-first for core finance features,
-   safely synchronized when online,
-   native Android and iOS experience,
-   accessible,
-   maintainable,
-   testable,
-   deployable,
-   free from AI slop.

------------------------------------------------------------------------

# 2. CORE PRODUCT PRINCIPLES

## 2.1 Financial Integrity First

Financial correctness is the highest-priority engineering requirement.

If ARTA cannot determine the correct financial state:

> STOP. DO NOT GUESS.

The system must create a conflict/reconciliation state and require a
safe resolution.

## 2.2 No Silent Data Loss

No operation may silently:

-   delete financial records,
-   overwrite newer data,
-   replace categories,
-   change balances incorrectly,
-   discard pending offline operations,
-   duplicate financial operations,
-   restore stale state over newer state.

## 2.3 Server Is Financial Authority

The server/database is authoritative for committed and reconciled financial state. SQLite is the local materialized state and the operational database for offline-first UI. An offline operation is locally durable but remains pending until the server validates and commits it.

Client timestamps are not conflict authority.

## 2.4 Realtime Is Transport, Not Truth

Laravel Reverb/WebSockets is a transport mechanism.

It is not the source of truth.

Missed realtime events must be recoverable through change-feed
reconciliation.

## 2.5 Old ARTA Is Reference Only

Old ARTA provides:

-   UI/UX reference,
-   feature reference,
-   interaction reference,
-   copy/content reference,
-   asset reference where appropriate.

Old ARTA does not provide:

-   runtime architecture,
-   Firebase,
-   sync authority,
-   authentication authority,
-   database authority,
-   financial rules,
-   backend implementation.

------------------------------------------------------------------------

# 3. REFERENCE PROJECT POLICY

Recommended workspace:

``` text
workspace/
├── ARTA-LAMA-REFERENCE/
└── ARTA-BARU/
```

The exact folder names may differ, but the separation must remain
explicit.

Actual workspace (verified 13 Oct 2026): the read-only reference on disk
is `ARTA-REFERENCE/` and the implementation target is `ARTA-BARU/`. All
rules for `ARTA-LAMA-REFERENCE/` apply to `ARTA-REFERENCE/`. Do not
rename folders automatically; a rename requires explicit user
confirmation.

## 3.1 Allowed Reference Activities

AI agents may:

-   inspect HTML,
-   inspect CSS,
-   inspect JavaScript,
-   inspect assets,
-   inspect page structure,
-   inspect navigation,
-   inspect forms,
-   inspect bottom sheets,
-   inspect tutorials,
-   inspect responsive behavior,
-   inspect copy,
-   inspect existing feature flows.

## 3.2 Forbidden Reference Activities

AI agents must not:

-   edit old source code,
-   migrate old Firebase code,
-   copy Firebase architecture,
-   reuse old service-worker architecture,
-   use old Firestore as the new database,
-   keep old Firebase authentication,
-   import old project files at runtime,
-   create symlinks or aliases that make the new app dependent on old
    files,
-   modify old files to "prepare" them for the new project.

## 3.3 Feature Parity Matrix

Before implementation is considered complete, create an internal feature
parity matrix:

  -------------------------------------------------------------------------------------------------------
  Legacy    Legacy     UI/UX       New           New              Offline   Realtime   Security   Tests
  Feature   Behavior   Reference   Requirement   Implementation                                   
  --------- ---------- ----------- ------------- ---------------- --------- ---------- ---------- -------

  -------------------------------------------------------------------------------------------------------

The matrix is for development control. It must not become a reason to
copy broken architecture.

------------------------------------------------------------------------

# 4. SCOPE

## 4.1 Included

The new ARTA includes:

- native Android and iOS applications distributed through Google Play Store and Apple App Store;
- email/password authentication, Google sign-in, email verification, and password reset;
- account and device/session management;
- financial accounts (cash, bank, e-wallet, savings, and investment as defined by product rules);
- income, expense, and transfer transactions;
- categories, budgets, targets, debts, and receivables;
- dashboard, analytics, and calendar;
- in-app notification history and supported native/local notifications;
- Trash and safe restore;
- CSV, JSON, and XLSX import/export;
- offline-first local finance workflows backed by SQLite;
- durable operation queue, synchronization, conflict handling, and reconciliation;
- server-side realtime updates where the app is active;
- security controls, accessibility, Indonesian and English localization;
- production backend operations and mobile store release processes.

## 4.2 Explicitly Excluded

The new ARTA must NOT include:

- any Firebase product or SDK, including Firebase Auth, Firestore, Realtime Database, Cloud Functions, Firebase Cloud Messaging (FCM), Firebase Analytics, Crashlytics, or Firebase App Check;
- a web app or PWA as a product target;
- IndexedDB, Service Worker, Web Push, or VAPID as active application architecture;
- OCR, receipt scanning, or receipt/photo evidence;
- PIN authentication or biometric authentication;
- unnecessary AI features, generic AI chatbot functionality, or AI-generated financial decisions;
- a promise of universal Android server-originated push notifications while the app is closed when FCM is prohibited.

## 4.3 Notification Platform Constraint

The no-Firebase decision is absolute. iOS server-originated push may be delivered directly through Apple Push Notification service (APNs). Android must support local notifications and in-app notification history. Universal server-originated Android push while the app is suspended or closed is NOT guaranteed under this architecture without FCM. An optional UnifiedPush integration may be considered later as a separately approved feature, but it requires a compatible distributor on the user's device and is not the default release assumption. WebSockets cannot be treated as a substitute for OS push when the app is suspended or terminated.

------------------------------------------------------------------------

# 5. TECHNOLOGY STACK

## Mobile Frontend

- React Native
- TypeScript
- Expo + EAS Build for Android and iOS builds and store submission workflows
- Expo Router or an equivalent typed navigation solution, selected during foundation work
- Expo SQLite as the primary local relational database, subject to a compatibility spike before implementation
- Expo SecureStore or an equivalent platform-secure credential store backed by Keychain/Keystore
- Native modules/config plugins when a required capability cannot be delivered safely through Expo's managed APIs
- No web frontend, Vite, PWA, Service Worker, IndexedDB, or web/browser storage architecture

## Backend

- Laravel API
- Laravel Sanctum/token-based mobile authentication, with token storage only in platform-secure storage
- Laravel Queue
- Laravel Scheduler
- Laravel Reverb/WebSockets for active-app realtime updates; not a source of truth and not a replacement for OS push

## Databases

- Server: MySQL 8+ as the authoritative shared financial database
- Device: SQLite through Expo SQLite as the primary local database and offline materialized state

## Notifications

- iOS remote push: direct APNs integration from the Laravel backend; do not route through Firebase or a service that uses FCM under the hood
- Android: local notifications and in-app history are baseline; reliable universal server-originated push while app is closed is not promised without FCM
- UnifiedPush: optional future Android path only after explicit approval and user-facing disclosure of distributor requirements
- Local scheduled notifications must be based on reminders already synced to the device and must be reconciled after reconnect

## Deployment

- Provider-neutral Laravel/API deployment; a VPS is not mandatory
- Production must support HTTPS, MySQL, durable queue workers, scheduler, Reverb/WebSockets if retained, secret management, monitoring, and encrypted backups
- Mobile binaries are built/signed and released through Google Play Console and Apple App Store Connect
- No frontend website hosting is required for ARTA's product UI; an HTTPS backend remains required

## Mandatory Compatibility Spike

Before full implementation, verify Expo SDK and package compatibility for SQLite transactions, background/foreground lifecycle, secure credential storage, local notifications, APNs, Android builds, and required native configuration. Record results and blockers for review. Do not silently add Firebase or FCM as a workaround.

------------------------------------------------------------------------

# 6. MONOREPO STRUCTURE

Target structure:

```text
ARTA-WORKSPACE/
├── AGENTS.md
├── ARTA-MASTER-PRD.md
├── ARTA-LAMA-REFERENCE/          # READ ONLY; never changed
└── ARTA-BARU/                    # only implementation target
    ├── mobile/
    │   ├── app/                  # native routes/screens
    │   ├── src/
    │   │   ├── components/
    │   │   ├── features/
    │   │   │   ├── dashboard/
    │   │   │   ├── transactions/
    │   │   │   ├── accounts/
    │   │   │   ├── categories/
    │   │   │   ├── budgets/
    │   │   │   ├── targets/
    │   │   │   ├── debts/
    │   │   │   ├── receivables/
    │   │   │   ├── calendar/
    │   │   │   ├── notifications/
    │   │   │   ├── trash/
    │   │   │   └── settings/
    │   │   ├── repositories/
    │   │   ├── database/
    │   │   ├── sync/
    │   │   ├── notifications/
    │   │   ├── security/
    │   │   ├── navigation/
    │   │   ├── i18n/
    │   │   └── theme/
    │   ├── assets/
    │   └── tests/
    ├── backend/                  # Laravel API
    ├── docs/
    ├── tests/
    └── README.md
```

Do not create a giant monolithic service. Do not create a God Service such as `FinancialService` containing every financial operation. The exact mobile folder organization may evolve, but mobile and backend must be independently testable and no runtime dependency may point to `ARTA-LAMA-REFERENCE/`.

------------------------------------------------------------------------

# 7. AUTHENTICATION

## 7.1 Supported Authentication

-   Email + password
-   Google Login
-   Forgot password
-   Reset password
-   Email verification
-   Logout current device
-   Logout all devices

PIN and biometric authentication are forbidden.

## 7.2 Email/Password

Rules:

-   password minimum 8 characters,
-   password cannot equal email,
-   no forced uppercase/lowercase/symbol composition requirement,
-   passwords are hashed,
-   passwords are never logged,
-   passwords are never exported.

## 7.3 Email Verification

Email/password accounts require verification.

Verification token:

-   expires after 1 hour.

Google-authenticated users do not require separate ARTA email
verification.

## 7.4 Password Reset

Reset token:

-   expires after 30 minutes.

Successful password reset:

-   revokes all other sessions/tokens.

## 7.5 Google Account Linking

If an email already belongs to an ARTA account:

-   do not automatically merge/link,
-   require password authentication first,
-   then explicitly allow Google linking.

## 7.6 Rate Limiting

Login must be rate-limited by:

-   email,
-   IP.

Authentication endpoints receive stricter rate limits.

## 7.7 Sessions

Use Laravel Sanctum.

Each device/session must be independently revocable.

Required concepts:

-   user_id,
-   device_id,
-   session/token identifier,
-   last used,
-   expiry,
-   revoked state.

------------------------------------------------------------------------

# 8. DEVICE MANAGEMENT

Each user can have multiple devices.

Device identity is:

-   persistent,
-   immutable,
-   unique.

Session identity is separate from device identity.

Device name:

-   generated from platform/device metadata where available,
-   user can rename.

Settings must show:

-   device name,
-   platform (Android/iOS),
-   app version/build where available,
-   last active,
-   current-device marker.

Actions:

-   logout a single device,
-   logout all devices.

Logout all devices also revokes server-side notification delivery credentials/tokens registered for those devices.

------------------------------------------------------------------------

# 9. USER ACCOUNT

User can edit:

-   name,
-   email,
-   password,
-   currency,
-   notification preference.

Deleting the ARTA account (user account — distinct from financial-account
deletion in §11, transaction Trash in §26, and backup retention in §74):

1.  require current password,
2.  require typing `HAPUS AKUN`,
3.  record the confirmation timestamp as the official retention start
    (absolute server time as in §22; fixed — queue, retry, scheduler,
    or processing delays must not shift it),
4.  from confirmation until purge completes: block login, stop showing
    financial data as an active account, stop financial reminder
    notifications, and cancel related local notifications when a
    device can process the cancellation; local data/operations must
    not reactivate the account; no account recovery or
    deletion-cancellation feature (none is defined),
5.  the server is authoritative: it blocks access and sync for the
    account; an offline device learns the deletion state on reconnect
    (behavior differs by connectivity, policy does not),
6.  backend Laravel owns the purge: the scheduler triggers a dedicated
    purge job for accounts past the 30-day retention; the job is
    idempotent,
    re-verifies status and eligibility by confirmation time before
    purging, and logs + retries failures without reactivating the
    account (plan — not implemented),
7.  purge the linked financial accounts, transactions, and related
    financial data with the account (keputusan A); individual
    financial-account deletion stays distinct; delete dependents
    before parents conceptually within a transaction; do not retain
    deleted-user transactions for audit/compliance without an
    explicitly approved policy,
8.  backups are handled explicitly and separately: purging primary
    data does not claim erasure from backups; backup retention
    period, erasure mechanism, and legal exceptions are follow-up
    decisions (not set),
9.  a deleting/deleted account must never reactivate via relogin,
    retry, old snapshot, outbox operation, change feed, or offline
    sync; its pending operations must not resurrect deleted data; on
    detecting deletion status the client stops normal retries and
    surfaces the state instead of syncing (consistent with B5
    isolation),
10. do not provide normal account recovery.

------------------------------------------------------------------------

# 10. FINANCIAL ACCOUNTS

Supported types:

-   Tunai
-   Bank
-   E-Wallet
-   Tabungan
-   Investasi

Unlimited accounts per type.

New account starts at:

> Rp0

There is no saldo awal field.

Money enters an account through valid financial operations.

Normal accounts must never become negative.

------------------------------------------------------------------------

# 11. ACCOUNT DELETION

Account deletion uses soft delete/Trash for 30 days.

Deletion must be rejected if active dependencies make deletion unsafe.

Examples:

-   active target contribution dependency,
-   active debt/receivable dependency,
-   other financial references that cannot safely be detached.

When safely deleted:

-   related transactions follow deletion policy,
-   operation must be atomic,
-   no orphan financial state.

Restore:

-   restores the same UUID,
-   must not create a duplicate.

------------------------------------------------------------------------

# 12. TRANSACTIONS

Main transaction types:

1.  Pemasukan
2.  Pengeluaran
3.  Transfer

## 12.1 Income

-   increases account balance,
-   requires income category.

## 12.2 Expense

-   decreases account balance,
-   requires expense category,
-   cannot make normal account negative.

## 12.3 Transfer

Transfer is a visible transaction type.

Rules:

-   source account,
-   destination account,
-   source != destination,
-   source decreases,
-   destination increases,
-   no category,
-   excluded from cashflow.

## 12.4 Editing

Transactions can be edited at any time.

The system must:

1.  reverse old financial effect,
2.  apply new financial effect,
3.  perform both atomically,
4.  validate the resulting state.

## 12.5 Deletion

Deletion:

-   creates tombstone/soft-delete state,
-   reverses financial effect atomically.

## 12.6 Amount

Money is stored as integer smallest currency unit.

Never use floating point for financial amounts.

------------------------------------------------------------------------

# 13. CATEGORIES

Categories are separated into:

-   income categories,
-   expense categories.

Default categories become user-owned.

User may:

-   edit,
-   rename,
-   delete.

Deleting a category must preserve historical references.

Old transactions may display:

> Deleted Category

Do not silently reassign historical transactions.

Default category seeding must be deterministic and idempotent.

------------------------------------------------------------------------

# 14. BUDGETS

One active budget per:

-   user,
-   category,
-   calendar year,
-   calendar month.

Thresholds:

  Usage      State
  ---------- ----------------
  \< 50%     Aman
  50--79%    Waspada
  80--99%    Hampir Habis
  \>= 100%   Melebihi Batas

## Notifications

Threshold notifications:

-   80%
-   100%

One notification per threshold crossing.

If usage falls and later crosses again, another notification may be
created.

If usage jumps directly from 75% to 105%:

-   create the 100% notification,
-   do not create separate 80% and 100% notifications for the skipped
    crossing.

------------------------------------------------------------------------

# 15. TARGETS

Target fields:

-   name,
-   target amount,
-   accumulated amount,
-   optional target date.

Contribution:

-   selects source account,
-   decreases source account,
-   increases target vault,
-   is NOT an expense,
-   is NOT a normal transfer.

Target vault is separate from normal accounts.

When target has no date:

-   no deadline notification.

When target is already reached but has a target date:

-   deadline notifications continue according to rules.

Target supports Trash/restore.

------------------------------------------------------------------------

# 16. DEBTS

Debt fields:

-   name,
-   original amount,
-   remaining amount,
-   optional due date,
-   notes.

Partial payments are supported.

Debt payment:

-   decreases account,
-   decreases remaining debt.

Paid when:

``` text
remaining_amount = 0
```

Debt operations must be atomic.

------------------------------------------------------------------------

# 17. RECEIVABLES

Receivable fields mirror debt.

Receipt:

-   increases selected account,
-   decreases remaining receivable.

Paid when:

``` text
remaining_amount = 0
```

Partial receipts are supported.

------------------------------------------------------------------------

# 18. DASHBOARD

Dashboard must show:

-   Pemasukan
-   Pengeluaran
-   Saldo
-   Cashflow

Cashflow:

``` text
income - expense
```

Transfers are excluded.

Period controls:

-   `Bulan Ini`
-   `Semua`
-   `Pilih Periode`

Use a custom ARTA period picker.

Do NOT use:

-   native `<select>`,
-   native date picker,
-   generic browser date controls or unstyled platform-default date controls.

------------------------------------------------------------------------

# 19. ANALYTICS

Required endpoints:

-   summary,
-   categories,
-   cashflow.

Charts must follow ARTA's monochrome visual system.

Category chart colors should use grayscale except semantic financial
accents where necessary.

Do not add flashy dashboard visualizations.

------------------------------------------------------------------------

# 20. CALENDAR

Calendar is a full feature.

It must not be hidden inside the More drawer.

Bottom navigation uses:

-   centered `+`,
-   Calendar replaces the previous `Lainnya` placement.

On Calendar:

-   back button is hidden where specified by the reference UI.

------------------------------------------------------------------------

# 21. NOTIFICATIONS

Notification sources:

-   debts,
-   targets,
-   budgets,
-   daily reminder.

## Debt schedule

-   H-3
-   H-1
-   H
-   overdue

## Target schedule

-   H-7
-   H-3
-   H
-   overdue

## Budget

-   80%
-   100%

## Daily Reminder

Default:

> 09:00 local device time.

No reminder if there has been activity within the previous rolling 24
hours.

Activity is represented by:

``` text
last_activity_at
```

Activity includes meaningful account-level data changes such as:

-   create transaction,
-   edit transaction,
-   delete transaction,
-   restore transaction,
-   account changes,
-   category changes,
-   budget changes,
-   target changes,
-   target contribution,
-   debt changes,
-   debt payment,
-   receivable changes,
-   receivable receipt.

Viewing data and login do not count as activity.

------------------------------------------------------------------------

# 22. DAILY REMINDER RULES

Daily reminders are account-level logical events with device-level
delivery.

Rules:

-   max one logical occurrence per account/day context,
-   device timezone determines 09:00 scheduling,
-   account activity on one device suppresses reminders on all devices,
-   login does not trigger an immediate reminder,
-   next reminder occurs at the next normal 09:00 schedule,
-   long inactivity does not create one notification per missed day,
-   missed reminders are summarized,
-   maximum missed-day summary is 7 days,
-   invalid/missing timezone defaults to UTC.

The server uses absolute timestamps/UTC for rolling 24-hour activity.

Timezone is only used for local scheduling.

------------------------------------------------------------------------

# 23. NATIVE NOTIFICATION MODEL (NO FIREBASE)

Firebase and FCM are prohibited without exception. Do not use Expo Push Service if the delivery path depends on FCM. The backend owns notification rules, scheduling, logical notification records, deduplication, delivery attempts, and delivery state.

## iOS Remote Push

- Laravel sends remote push directly to APNs using server-managed Apple credentials.
- Credentials are stored only in deployment secret management and never in the repository or mobile bundle.
- Device registration stores the platform and APNs token securely server-side; token rotation and invalidation must be handled.
- APNs delivery is best-effort; notification history in the app remains the durable record.

## Android Notifications

- Baseline: local notifications for already-synced reminders and in-app notification history.
- Server-originated push to an Android app that is suspended or terminated is not universally guaranteed under the absolute no-FCM rule.
- Do not use persistent WebSockets, background polling, or foreground services as a hidden substitute for OS push.
- Optional UnifiedPush support requires a separate product decision, compatible distributor availability, registration lifecycle, test coverage, and clear disclosure. It is not a mandatory dependency for the initial release.

## Reminder Reconciliation

- The server remains authoritative for notification rules and history.
- The app syncs notification records and reminder schedules when foregrounded/online.
- Local notifications are scheduled only from known, valid data already synced to the device.
- When the schedule, timezone, or underlying financial record changes, stale local schedules must be cancelled/replaced safely.
- Local notification delivery must not be misrepresented as proof that a server event occurred while the app was offline.

## Preferences

Global preference:

```text
notifications_enabled
```

Per-device preference:

```text
enabled
```

Rules:

| Account | Device | Result |
|---|---|---|
| OFF | ON | no delivery |
| OFF | OFF | no delivery |
| ON | ON | delivery through the capability supported by that platform |
| ON | OFF | no delivery |

If OS permission is denied, mark that device's OS notification capability unavailable, explain the state, and do not repeatedly request permission. Invalid platform tokens are disabled promptly. Temporary server delivery failures use bounded retries, exponential backoff, and jitter.

## Explicit Limitation

The product must not claim equivalent push coverage between Android and iOS. iOS can use APNs directly. Android's baseline is local + in-app notifications, and remote notification coverage while closed remains limited unless a separately approved non-FCM transport is available to that user.

Decision B1 — CLOSED (product decision, 13 Oct 2026): Android guaranteed baseline = local notifications + in-app history. No promised server push to Android while closed/suspended. UnifiedPush is OUT OF initial scope (separate decision only). Technical validation remains phase work.

------------------------------------------------------------------------

# 24. NOTIFICATION IDEMPOTENCY

Notifications require:

-   logical key,
-   per-delivery idempotency.

The same logical notification must not produce duplicate delivery on the
same device/subscription.

If a user misses multiple push notifications:

-   produce a summary notification when appropriate,
-   do not spam one push for every missed event.

Overdue notifications represent the current overdue condition.

Do not create daily overdue spam.

------------------------------------------------------------------------

# 25. NOTIFICATION HISTORY

Notification history:

-   newest to oldest,
-   unread/read state,
-   mark all read,
-   delete all.

Opening a notification does NOT automatically mark it read.

Notification deletion is permanent.

Notification deletion is not part of Trash.

If a source financial record is deleted:

-   related notification is deleted.

If source is restored:

-   scheduler may create a new valid notification.

Retention:

> 30 days.

Realtime updates are delivered through Reverb without requiring refresh.

If Reverb delivers a notification while the app is active on the same
device:

-   do not also display a duplicate local notification for that same event.

------------------------------------------------------------------------

# 26. TRASH

Resources using soft delete:

-   transactions,
-   categories,
-   budgets,
-   targets,
-   debts,
-   receivables,
-   accounts.

Trash retention:

> 30 days.

User can:

-   restore,
-   permanently delete.

Permanent deletion is immediate after explicit confirmation.

Trash is not a separate database table.

Use `deleted_at`.

------------------------------------------------------------------------

# 27. IMPORT / EXPORT

Supported export formats:

-   CSV
-   JSON
-   XLSX

Export:

-   authenticated user only,
-   server-side consistent snapshot,
-   read-only,
-   does not count as activity.

Supported import formats:

-   CSV
-   JSON
-   XLSX

Pipeline:

``` text
Upload
→ Parse
→ Schema validation
→ Ownership/reference validation
→ Financial integrity validation
→ Duplicate/conflict detection
→ Preview
→ User confirmation
→ Atomic import
→ Reconciliation
```

Default import mode is all-or-nothing.

Every import has:

``` text
import_id
```

and is idempotent.

Duplicate detection must not rely only on:

-   date,
-   amount.

Use stable import identity/fingerprint.

Ambiguous conflicts must be surfaced instead of guessed.

Technical upload/file-size limits are acceptable.

Do not impose arbitrary business data limits.

------------------------------------------------------------------------

# 28. OFFLINE-FIRST ARCHITECTURE

SQLite through Expo SQLite is the primary local database. It stores local entities, materialized financial state, pending operations, sync metadata, tombstones, conflict state, and the notification/reminder data required for offline behavior.

Every local financial mutation must write both the local entity changes and its operation-queue record inside the same SQLite transaction. If either write fails, both must roll back.

Offline mutation flow:

```text
Native UI
→ local domain validation
→ SQLite transaction (entity mutation + operation queue)
→ stable operation_id
→ pending sync queue
→ immediate local UI update
```

Local acceptance does not mean server acceptance. The UI must clearly distinguish pending, synced, rejected, and conflict states. The server revalidates all financial rules before commit.

## SQLite Requirements

- Use parameterized queries; never build SQL from untrusted strings.
- Enable and verify appropriate transaction semantics and foreign-key constraints.
- Define schema migrations and test upgrades from every supported prior local schema.
- Avoid holding database transactions open during network calls.
- Keep auth credentials out of SQLite; use Keychain/Keystore-backed secure storage.
- Plan for app termination at every stage of a local write and sync operation.
- Do not assume SQLite automatically synchronizes with MySQL; ARTA must implement its own operation queue and reconciliation protocol.

## Reset and Recovery

If local data is missing, corrupted, or reset, the app must not silently treat that as an empty financial account and upload destructive changes. Authenticate, fetch a server snapshot/change cursor, reconcile safely, and surface recoverable local-only pending operations when available. If pending operations cannot be recovered, stop and explain the risk rather than guessing.

------------------------------------------------------------------------

# 29. OPERATION MODEL

Every mutation has:

``` text
operation_id
```

The same operation_id is reused for retries.

Ordering follows causal dependencies within one account and one sync
sequence — not one global queue across users. FIFO is mandatory for:
create-before-update/delete of the same entity; financial-account
creation before transactions referencing it; sequential changes to the
same entity from the same device; linked debt/receivable payment,
budget, or target operations where the PRD model requires it;
tombstone and late-arriving operations; and any pending operation of
an account under deletion (deletion/purge status wins — stale
operations must not resurrect its data). Independent operations need
no global order and must not be blocked without cause. Failed-op
retry must not let dependents apply first; reprocessed success must
not duplicate financial effect (see §30). Feature-level dependencies
not decidable from the PRD model are technical decisions due before
that feature's implementation.

FIFO acceptance: dependents never apply before prerequisites; retry
preserves causal order without duplicate effect; independent ops stay
unblocked; a failed op never validates its children; version
conflicts follow §31; stale ops cannot resurrect deleted entities;
deletion blocks the account's pending ops from re-applying; final
state equals a valid causal order.

Statuses may include:

-   pending,
-   processing,
-   completed,
-   failed,
-   conflict,
-   blocked,
-   cancelled.

Dependent operations must wait for prerequisites.

Network errors:

-   exponential backoff,
-   jitter,
-   maximum attempts.

Business validation errors:

-   do not retry forever.

------------------------------------------------------------------------

# 30. IDEMPOTENCY

The backend stores operation results keyed by:

-   user,
-   device,
-   operation_id.

If the same operation is submitted twice:

-   return the existing operation result,
-   do not apply the financial mutation twice.

This protects against:

-   timeout-after-commit,
-   client retries,
-   network duplication,
-   reconnects.

------------------------------------------------------------------------

# 31. CONFLICT CONTROL

Do NOT use:

-   Last Write Wins,
-   device timestamp winner,
-   client Date.now as authority,
-   silent overwrite.

Mutable entities use a version/revision field.

Client sends:

``` text
expected_version
```

Server compares:

``` text
expected_version
vs
actual_version
```

Mismatch produces a conflict.

Financial conflicts return:

``` http
409 Conflict
```

------------------------------------------------------------------------

# 32. CONFLICT UI

Conflict UI is modal/notification based.

No dedicated conflicts page is required.

Conflict state must survive:

-   screen navigation,
-   app restart,
-   offline restart.

Resolution must be field-level where applicable.

Do not provide a simplistic blind:

-   "Mine"
-   "Theirs"

resolution without evaluating fields.

After conflict resolution:

-   backend revalidates full financial impact,
-   account balance constraints are checked again,
-   invalid resolution must be rejected safely.

------------------------------------------------------------------------

# 33. CHANGE FEED

Backend maintains a change feed.

Events include:

-   created,
-   updated,
-   deleted,
-   restored.

Each device tracks a cursor/revision.

Cursor gaps require reconciliation/resync.

Reverb only transports events.

Reverb reconnect must trigger reconciliation.

Duplicate realtime events must be idempotent on the client.

------------------------------------------------------------------------

# 34. SYNC HIERARCHY

The authoritative hierarchy is:

``` text
Server DB
↓
Server revision/change feed
↓
Operation result
↓
Client SQLite
↓
React UI
```

Realtime:

``` text
Reverb = transport
```

Snapshots:

``` text
Safety net / reconciliation mechanism
```

Client timestamp:

``` text
NOT authority
```

------------------------------------------------------------------------

# 35. BALANCE SAFETY

Balance is a hybrid cache.

It is not the ultimate financial source of truth.

Transactions and financial operations provide the basis for
reconciliation.

For balance-affecting operations:

-   validate locally,
-   validate on server,
-   use database transaction,
-   use row-level locking,
-   revalidate before commit.

Offline operations that later become invalid must fail/conflict safely.

Never force an account negative.

------------------------------------------------------------------------

# 36. SYNC FAILURE CASES THAT MUST BE TESTED

Required tests:

-   offline create,
-   offline edit,
-   offline delete,
-   delete while another device is offline,
-   concurrent edits,
-   concurrent financial operations,
-   duplicate request,
-   timeout after server commit,
-   Reverb disconnect,
-   missed events,
-   cursor gap,
-   tombstone,
-   restore,
-   insufficient balance offline,
-   insufficient balance on server,
-   crash during local write,
-   crash during sync,
-   network flapping,
-   simultaneous multi-device mutations,
-   complete local DB reset followed by full reconciliation.

------------------------------------------------------------------------

# 37. NATIVE APP LIFECYCLE AND LOCAL DATA

ARTA is a native Android/iOS application, not a PWA. There is no web app shell, manifest, Service Worker, IndexedDB, Web Push, or VAPID requirement.

## Lifecycle

- Persist each accepted local operation before reporting it as queued.
- Resume pending sync when the app returns to the foreground and connectivity is available.
- Background execution is opportunistic and OS-controlled; never promise continuous background sync.
- On foreground/reconnect, compare the saved server cursor, fetch missing changes, reconcile pending operations, and refresh notification/reminder schedules.
- Handle app termination, OS suspension, permission changes, network loss, and token expiry without corrupting local data.

## Local Data Protection

- Minimize sensitive data stored on device.
- Use secure storage for credentials and refresh/session secrets.
- Consider platform-supported database encryption only after evaluating Expo compatibility, key management, performance, and recovery implications; do not invent an encryption guarantee if the selected implementation does not provide one.
- Logout must revoke the server session and clear local credentials. Preserve or clear cached financial data according to an explicit, tested privacy policy; never delete server data on logout.
- App reinstall/local database loss must be handled through server reconciliation, not by treating local absence as a deletion request.

## Logout and Pending Operations Policy (B5 — DECIDED, 13 Oct 2026)

1. Logout revokes the server session and clears local credentials.
2. Plain logout MUST NOT delete server financial data.
3. With pending sync ops: warn the user and offer to sync first.
4. NEVER discard pending operations silently.
5. On forced logout, keep the pending queue plus required local data in a locked, account-isolated local partition for that account.
6. After the SAME account logs back in, pending ops may resume via safe reconciliation.
7. On account switch, the new account MUST NOT read, mutate, or sync the prior account's data or queue.
8. All queries and sync operations MUST be scoped to the authenticated account.
9. No button to discard the entire pending queue without a separate product decision and explicit approval.
10. Account deletion is a separate flow from plain logout (password + `HAPUS AKUN`).

Security note: SQLite is NOT automatically encrypted. Evaluate local database encryption, key storage, Expo/native compatibility, and recovery behavior before production. Do not claim encryption until verified.

------------------------------------------------------------------------

# 38. LOCAL DATA AND CACHE POLICY

SQLite is the local source for offline UI state; it is not a generic HTTP cache. API responses containing financial data must be validated and applied through repositories and sync rules rather than blindly cached as authoritative.

- Server snapshots and change-feed pages must be applied transactionally where required.
- Persist the server cursor only after all changes up to that cursor have been applied successfully.
- Tombstones and conflict records must survive app restarts until safely reconciled.
- Do not evict pending operations to free space.
- Cache cleanup must never delete the only recoverable copy of unsynced user data without an explicit recovery flow.
- No Service Worker or browser cache is used.

------------------------------------------------------------------------

# 39. SECURITY ARCHITECTURE

Every API endpoint must authorize the authenticated user server-side.

Never trust:

``` text
user_id
```

from frontend input.

Ownership must be derived from authenticated context.

Use:

-   Laravel Policies,
-   Form Requests,
-   explicit allowlists,
-   API Resources.

Never use:

``` php
$request->all()
```

for mass assignment.

Never blindly bind user input into sensitive fields.

------------------------------------------------------------------------

# 40. SECURITY HTTP CONTRACT

Required status codes:

  Status   Meaning
  -------- ---------------------
  200      Success
  201      Created
  202      Accepted/background
  401      Unauthenticated
  403      Unauthorized
  404      Not found
  409      Conflict
  422      Validation
  429      Rate limited
  500      Server error

Sensitive errors must never expose:

-   SQL,
-   stack traces,
-   filesystem paths,
-   secrets,
-   internal credentials.

------------------------------------------------------------------------

# 41. API RESPONSE CONTRACT

Standard API response:

``` json
{
  "success": true,
  "data": {},
  "message": "...",
  "errors": {},
  "meta": {}
}
```

Use API Resources.

Do not return raw Eloquent models indiscriminately.

------------------------------------------------------------------------

# 42. API VERSIONING

Base prefix:

``` text
/api/v1
```

All production endpoints must use this versioned contract.

------------------------------------------------------------------------

# 43. UUID POLICY

Main entities use UUID v7.

At minimum:

-   users,
-   devices,
-   accounts,
-   categories,
-   transactions,
-   budgets,
-   targets,
-   debts,
-   receivables,
-   notifications,
-   push subscriptions,
-   operations,
-   conflicts.

UUIDs must not be regenerated during restore.

------------------------------------------------------------------------

# 44. DATABASE

Database:

> MySQL 8+

Use foreign keys.

Do not use indiscriminate cascade deletion on financial data.

Soft-deleted resources should use appropriate indexes such as:

``` text
(user_id, deleted_at)
```

Financial operations must use database transactions.

Balance-changing operations must use appropriate row-level locking.

------------------------------------------------------------------------

# 45. DATABASE SCHEMA

## users

``` text
id
name
email
password
email_verified_at
currency
notifications_enabled
last_activity_at
created_at
updated_at
deleted_at
```

## devices

``` text
id
user_id
device_name
platform
app_version
build_number
timezone
last_active_at
created_at
updated_at
deleted_at
```

## sessions

``` text
id
user_id
device_id
token_identifier
last_used_at
expires_at
created_at
revoked_at
```

## security_audit_logs

``` text
id
user_id
device_id
event_type
metadata
ip_address
user_agent
created_at
```

## accounts

``` text
id
user_id
name
type
currency
balance_cache
version
created_at
updated_at
deleted_at
```

## categories

``` text
id
user_id
type
name
icon_key
version
created_at
updated_at
deleted_at
```

## transactions

``` text
id
user_id
type
account_id
destination_account_id
category_id
amount
transaction_date
note
version
created_at
updated_at
deleted_at
```

## budgets

``` text
id
user_id
category_id
year
month
limit_amount
version
created_at
updated_at
deleted_at
```

## targets

``` text
id
user_id
name
target_amount
accumulated_amount
target_date
version
created_at
updated_at
deleted_at
```

## debts

``` text
id
user_id
name
original_amount
remaining_amount
due_date
notes
version
created_at
updated_at
deleted_at
```

## receivables

Same structure as debts.

## operations

``` text
id
user_id
device_id
operation_id
operation_type
entity_type
entity_id
expected_version
status
payload_hash
created_at
processed_at
```

## operation_results

``` text
id
operation_id
status
response_code
result_payload
created_at
```

## conflicts

``` text
id
user_id
device_id
operation_id
entity_type
entity_id
server_version
client_version
conflicting_fields
status
resolution_payload
created_at
resolved_at
```

## change_feed

``` text
id
user_id
revision
entity_type
entity_id
operation_id
change_type
version
created_at
```

## notifications

``` text
id
user_id
type
source_type
source_id
title
body
status
logical_key
created_at
read_at
deleted_at
```

## device_notification_tokens

```text
id
user_id
device_id
platform                 # ios | android
provider                 # apns | local_only | unifiedpush (optional future)
token                    # nullable for local_only; never store private credentials here
enabled
last_seen_at
invalidated_at
created_at
updated_at
```

Never store APNs private keys/certificates or other provider secrets in this table. The `unifiedpush` provider is not enabled unless separately approved. No FCM provider or Firebase-related field is allowed.

## notification_deliveries

``` text
id
notification_id
device_id
push_subscription_id
status
attempts
last_attempt_at
delivered_at
failed_at
```

## imports

``` text
id
user_id
device_id
format
status
file_metadata
summary
created_at
completed_at
```

## import_items

``` text
id
import_id
row_number
entity_type
status
fingerprint
error_code
error_message
```

------------------------------------------------------------------------

# 46. DOMAIN SERVICES

Separate financial services.

Required conceptual services:

-   TransactionService
-   TransferService
-   DebtService
-   ReceivableService
-   TargetService
-   BudgetService
-   AccountService
-   SyncService

Controllers should be thin:

``` text
Request
→ Authorization
→ Application/Domain Service
→ Database Transaction
→ Event
→ Resource Response
```

Do not put complex financial rules in controllers.

------------------------------------------------------------------------

# 47. API ENDPOINTS

Base:

``` text
/api/v1
```

## Auth

``` http
POST /auth/register
POST /auth/login
POST /auth/google
POST /auth/verify-email
POST /auth/resend-verification
POST /auth/forgot-password
POST /auth/reset-password
POST /auth/logout
POST /auth/logout-all
```

## Profile

``` http
GET /me
PATCH /me
PATCH /me/email
PATCH /me/password
DELETE /me
```

## Devices

``` http
GET /devices
PATCH /devices/{device}
DELETE /devices/{device}/session
POST /devices/{device}/notification-token
DELETE /devices/{device}/notification-token
```

## CRUD resources

Provide standard authenticated CRUD endpoints for:

-   accounts,
-   categories,
-   transactions,
-   budgets,
-   targets,
-   debts,
-   receivables.

Restore endpoints are required for soft-deleted resources.

## Financial operations

``` http
POST /targets/{id}/contributions
POST /debts/{id}/payments
POST /receivables/{id}/receipts
POST /transfers
```

## Dashboard

``` http
GET /dashboard
```

## Analytics

``` http
GET /analytics/summary
GET /analytics/categories
GET /analytics/cashflow
```

## Calendar

``` http
GET /calendar
```

## Notifications

``` http
GET /notifications
POST /notifications/{id}/read
POST /notifications/read-all
DELETE /notifications/{id}
DELETE /notifications
```

## Sync

``` http
POST /sync/operations
GET /sync/changes
POST /sync/reconcile
POST /sync/conflicts/{id}/resolve
```

------------------------------------------------------------------------

# 48. PAGINATION AND QUERYING

Use server-side pagination.

Use cursor/keyset pagination where appropriate.

Filtering must be server-side.

Do not load unlimited financial history into one API response.

------------------------------------------------------------------------

# 49. UI/UX DIRECTION

The old ARTA UI/UX is the primary visual reference.

Do not broadly redesign it.

New architecture may require additional screens/settings, but the
existing visual language should remain coherent.

------------------------------------------------------------------------

# 50. ARTA VISUAL SYSTEM

Style:

> MONOCHROME / Pro Max

Rules:

-   black,
-   gray,
-   white,
-   solid surfaces,
-   restrained semantic accents.

Avoid:

-   gradients,
-   excessive blur,
-   heavy backdrop-filter,
-   excessive glassmorphism,
-   decorative noise,
-   AI slop,
-   generic SaaS dashboard styling,
-   Gemini-like sparkles,
-   generic AI assistant elements.

Semantic colors:

-   income: `#10B981`
-   expense: `#EF4444`
-   debt: red
-   receivable: blue
-   paid: green
-   charts: primarily grayscale.

------------------------------------------------------------------------

# 51. ICONOGRAPHY

Do not use emoji as structural UI icons.

Do not use:

-   Gemini/sparkle icons,
-   AI assistant marks,
-   generic generated decorative symbols.

ARTA branding should use the official ARTA visual assets.

------------------------------------------------------------------------

# 52. NATIVE DEVICE ADAPTATION

The product target is native Android/iOS, not desktop web. Test representative small and large phones, screen density, font scaling, portrait orientation, keyboard states, cutouts/notches, safe areas/home indicators, Android system navigation and edge-to-edge layouts, app lifecycle, and permission states. Tablet support must be explicitly defined and tested if included. Do not use web pixel breakpoints as the only device compatibility strategy.

------------------------------------------------------------------------

# 53. ACCESSIBILITY

Required native baseline:

- accessible names, roles, hints, and states for controls;
- VoiceOver and TalkBack support;
- sufficient contrast and status cues that do not rely on color alone;
- predictable focus order and focus handling in dialogs/sheets;
- respect system font scaling where practical;
- usable touch targets and assistive-technology-compatible gestures;
- reduced-motion preferences where animations exist;
- no critical action that depends on color, animation, or gesture alone.

------------------------------------------------------------------------

# 54. MODALS / BOTTOM SHEETS

Bottom sheets are a shared interaction pattern.

They are used consistently for relevant:

-   transaction forms,
-   budget forms,
-   debt/receivable forms,
-   target forms.

Scroll locking must preserve the exact background scroll position.

Do not reintroduce the old global `.no-scroll` style bug.

Opening a form must not cause the underlying page to jump to the top.

------------------------------------------------------------------------

# 55. NAVIGATION

Bottom navigation:

-   main navigation,
-   centered `+`,
-   Calendar integrated into navigation,
-   no obsolete `Lainnya` calendar duplication.

Calendar must not be duplicated in a More drawer.

------------------------------------------------------------------------

# 56. NOTIFICATION UI

Header notification icon remains.

Notification UI supports:

-   read all,
-   delete all,
-   individual read,
-   individual delete.

------------------------------------------------------------------------

# 57. TUTORIALS

Tutorial registry:

## Transaksi

4 steps.

## Anggaran

3 steps.

## Utang & Piutang

4 steps.

## Target

3 steps.

Settings includes:

> Lihat Tutorial Lagi

Tutorial reset behavior must be implemented correctly.

No tutorial should unexpectedly restart on unrelated navigation.

------------------------------------------------------------------------

# 58. PERIOD PICKER

Dashboard period controls:

``` text
Bulan Ini
Semua
Pilih Periode
```

Use a custom ARTA picker.

Do not use native:

``` html
<select>
```

or unstyled platform-default date controls for the ARTA period UI.

------------------------------------------------------------------------

# 59. FORM VALIDATION

Frontend validation exists for UX.

Backend validation is authoritative.

Financial validation must happen again on the server.

Never trust:

-   client amount validation,
-   client balance,
-   client ownership,
-   client user_id,
-   client version,
-   client permission.

------------------------------------------------------------------------

# 60. LOCALIZATION

i18n must exist from the beginning.

Release languages:

-   Indonesian,
-   English.

Default:

> Indonesian.

Do not hardcode user-facing strings throughout the application.

------------------------------------------------------------------------

# 61. TIMEZONE

Timezone is device-based.

No manual timezone setting is required.

Device sends latest timezone on reconnect.

This is:

-   idempotent,
-   non-financial,
-   not a notification,
-   not a financial activity.

Invalid/missing timezone:

> UTC.

------------------------------------------------------------------------

# 62. FORMATTING

Use a centralized formatting layer for:

-   currency,
-   numbers,
-   dates,
-   percentages,
-   locale-specific display.

Do not duplicate formatting logic across components.

------------------------------------------------------------------------

# 63. LOADING / EMPTY / ERROR STATES

Every major feature must have intentional states for:

-   loading,
-   empty,
-   success,
-   error,
-   offline,
-   syncing,
-   conflict.

Do not leave raw native/runtime errors or blank screens.

------------------------------------------------------------------------

# 64. SYNC STATUS UI

Required states:

-   `Tersinkron`
-   `Menyinkronkan…`
-   `Menunggu koneksi`
-   `Ada konflik`
-   `Gagal disinkronkan`

The UI must communicate sync state without overwhelming the user.

------------------------------------------------------------------------

# 65. REALTIME ARCHITECTURE

Laravel Reverb is used for:

-   realtime financial updates,
-   notification updates,
-   relevant device synchronization signals.

Reverb does not replace:

-   database authority,
-   change feed,
-   operation idempotency,
-   reconciliation.

On reconnect:

``` text
Reverb reconnect
→ compare cursor
→ reconcile missing changes
→ continue realtime
```

------------------------------------------------------------------------

# 66. QUEUES

Laravel Queue handles background work such as:

-   notification delivery,
-   push delivery retries,
-   cleanup,
-   imports where appropriate,
-   other bounded background jobs.

Financial mutations must not be made eventually consistent merely
because queues exist.

User-facing financial commits must have clear transactional semantics.

------------------------------------------------------------------------

# 67. SCHEDULER

Laravel Scheduler runs every 5 minutes.

Scheduler responsibilities include:

-   debt deadline checks,
-   target deadline checks,
-   budget threshold checks,
-   daily reminder scheduling,
-   notification cleanup,
-   push subscription cleanup,
-   other bounded maintenance.

Every scheduled action must be idempotent.

------------------------------------------------------------------------

# 68. FINANCIAL ATOMICITY

Any operation that changes financial state must use a DB transaction.

Examples:

-   income,
-   expense,
-   transfer,
-   target contribution,
-   debt payment,
-   receivable receipt,
-   edit of financial transaction,
-   deletion that reverses financial effect,
-   restoration that reapplies financial effect.

If any part fails:

> rollback all parts.

------------------------------------------------------------------------

# 69. LOCKING

Balance-changing operations must lock relevant rows appropriately.

Example conceptual sequence:

``` text
BEGIN
→ authorize
→ lock affected account rows
→ verify current versions/balances
→ validate operation
→ update financial entities
→ update balance cache
→ create change feed
→ record operation result
→ COMMIT
```

Never trust a previously read client balance for final authorization.

------------------------------------------------------------------------

# 70. ACTIVITY TRACKING

`last_activity_at` is the deterministic account activity marker.

It is updated for meaningful data changes.

It is NOT updated for:

-   login,
-   viewing,
-   opening dashboard,
-   exporting,
-   reconnecting.

This field drives the daily reminder suppression logic.

------------------------------------------------------------------------

# 71. SECURITY LOGGING

High-risk security events must be auditable.

Examples:

-   login failures,
-   password changes,
-   password resets,
-   logout all,
-   account deletion,
-   security-sensitive account changes.

Logs must not contain:

-   passwords,
-   secrets,
-   tokens,
-   raw financial payloads unnecessarily.

Include safe contextual metadata such as:

-   user,
-   device,
-   IP,
-   user agent,
-   event type,
-   request/operation ID where appropriate.

------------------------------------------------------------------------

# 72. SECURITY HEADERS

Production should provide appropriate:

-   CSP,
-   HSTS,
-   X-Content-Type-Options,
-   Referrer-Policy,
-   frame protection.

CORS must use an explicit production allowlist.

Do not use wildcard CORS in production.

------------------------------------------------------------------------

# 73. STORAGE SECURITY

Do not store sensitive credentials in localStorage.

Authentication/session credentials must be stored using platform-secure storage (Keychain/Keystore-backed), not ordinary app preferences or SQLite.

Secrets must never be committed to Git.

Environment secrets must use deployment secret management.

------------------------------------------------------------------------

# 74. BACKUPS

Production database backups must be:

-   encrypted,
-   access-controlled,
-   retained according to policy,
-   tested for restoration.

Restore tests are mandatory.

Permanent deletion should account for active backup retention.

Backup retention decisions (kebijakan backup):

-   D1 — retention period: DECIDED 30 days (keputusan produk
    13 Okt 2026). Provider capability to enforce it must still be
    verified before production. Account-deletion retention (30 days
    from confirmation) and backup retention (30 days) are distinct
    policies with different purposes, start points, and erasure
    mechanisms — the equal numbers are coincidence.
-   D2 — expiry/erasure mechanism: OPEN until hosting evaluation
    (B4) completes. Do not assume automatic expiry or an operational
    procedure before provider capabilities are checked; document the
    actually available mechanism with limits, controls, deletion
    evidence, and failure procedure after B4.
-   D3 — legal/audit/operational exceptions: OPEN, needs
    verification. Do not invent legal obligations or set exceptions
    without confirmation.
-   D4 — post-restore access: DECIDED. Restored backups must not be
    served before account-deletion status is reconciled against the
    authoritative deletion record; access stays blocked during
    validation and reconciliation.

Restore requirements (plan — not implemented):

-   After any restore, deletion status stays authoritative:
    reconcile deletion records before serving restored data, gate
    access during validation, and re-run the idempotent purge
    safely; failures are logged and retried without reactivation.
-   Restored snapshots, outbox operations, retries, change-feed
    data, and long-offline devices must not resurrect deleted
    accounts or data (same rule as §9/A5, applied to restores).
-   The deletion record used for reconciliation must itself survive
    or be re-applied across a restore; the concrete design is
    deferred to backend implementation (no table/endpoint fixed
    here).
-   Server-held manual snapshots, replicas, and exports in scope of
    the policy must be inventoried; user-held exports (CSV/JSON/XLSX)
    cannot be erased by server purge and must be disclosed as such.
-   Purging primary data never promises erasure from all backups;
    primary deletion and backup expiry are distinct events.

------------------------------------------------------------------------

# 75. DEPLOYMENT ARCHITECTURE

```text
Android app (Google Play) ─┐
                            ├─ HTTPS API ─ Laravel ─ MySQL
 iOS app (App Store) ──────┘                 ├─ Queue worker
                                             ├─ Scheduler
                                             ├─ Reverb/WebSockets (active-app realtime)
                                             └─ APNs provider (iOS remote push)
```

The mobile UI is delivered as signed native application binaries, not through frontend hosting. A public HTTPS backend is required. A VPS is optional if a managed provider supports Laravel, MySQL, queue workers, scheduled jobs, WebSockets if retained, secrets, backups, and monitoring.

Decision B4 — DEFERRED (13 Oct 2026): no production hosting provider selected. Domain alone is insufficient for Laravel + MySQL. Do not select a provider on the user's behalf; selection and validation belong to the deployment phase. The chosen provider MUST satisfy HTTPS, Laravel, MySQL, queue worker, scheduler, secret management, backup, monitoring, plus realtime if retained.

Store submission requires app identifiers, signing credentials, privacy disclosures, screenshots/metadata, age/content declarations, and compliance with current Google Play and Apple App Store requirements. Store approval must not be assumed.

------------------------------------------------------------------------

# 76. REQUIRED PRODUCTION SERVICES

Production requires:

1. Laravel API runtime with HTTPS;
2. MySQL with encrypted backups and tested restore;
3. durable queue worker;
4. scheduler/cron;
5. Reverb/WebSocket service if retained for active-app realtime;
6. deployment secret management;
7. monitoring, structured logs, and alerting;
8. APNs credentials/configuration for iOS remote push;
9. mobile signing/build configuration for Android and iOS;
10. Google Play Console and Apple App Store Connect release processes.

No ARTA web frontend hosting, web manifest, or Service Worker deployment is required. No Firebase service is permitted.

------------------------------------------------------------------------

# 77. DEPLOYMENT ORDER

Recommended order:

``` text
1. Database migration
2. Backend deployment
3. Queue worker
4. Scheduler
5. Reverb
6. Backend smoke tests
7. Build and sign native Android/iOS artifacts
8. Install/update smoke tests on physical devices
```

Rollback strategy is mandatory.

API backward compatibility must be maintained during transitions.

------------------------------------------------------------------------

# 78. TESTING PYRAMID

Testing layers:

``` text
Unit
↓
Component
↓
Domain/API Integration
↓
E2E
↓
Production smoke test
```

------------------------------------------------------------------------

# 79. UNIT TESTS

Required unit coverage includes:

-   currency calculations,
-   cashflow,
-   budget percentage,
-   budget thresholds,
-   target contribution,
-   debt remaining,
-   receivable remaining,
-   transfer,
-   conflict comparison,
-   notification rules,
-   timezone behavior,
-   daily reminder logic.

------------------------------------------------------------------------

# 80. INTEGRATION TESTS

Required:

-   registration,
-   login,
-   Google login,
-   email verification,
-   password reset,
-   ownership,
-   account CRUD,
-   transaction CRUD,
-   financial locking,
-   idempotency,
-   soft delete,
-   restore,
-   Trash,
-   notification generation,
-   notification delivery,
-   import/export,
-   queue behavior,
-   scheduler behavior.

------------------------------------------------------------------------

# 81. SECURITY TESTS

Required:

-   unauthorized access,
-   cross-user resource access,
-   IDOR,
-   mass assignment,
-   invalid ownership,
-   invalid versions,
-   rate limiting,
-   session revocation,
-   password reset revocation,
-   CORS,
-   XSS,
-   SQL injection defenses,
-   CSRF/session behavior,
-   sensitive error leakage,
-   secret leakage.

------------------------------------------------------------------------

# 82. E2E TESTS

Critical E2E flows:

-   register,
-   verify,
-   login,
-   create account,
-   income,
-   expense,
-   transfer,
-   budget,
-   target contribution,
-   debt payment,
-   receivable receipt,
-   edit transaction,
-   delete transaction,
-   restore transaction,
-   notifications,
-   Trash,
-   import,
-   export,
-   offline mutation,
-   reconnect,
-   conflict resolution,
-   logout,
-   logout all,
-   account deletion.

------------------------------------------------------------------------

# 83. UI REGRESSION

The new application must be compared against the old ARTA reference for:

-   layout,
-   navigation,
-   forms,
-   spacing,
-   typography,
-   interaction,
-   responsive behavior,
-   copy,
-   tutorials.

This is visual/behavioral comparison only.

It does not authorize copying old backend architecture.

------------------------------------------------------------------------

# 84. NATIVE LAYOUT REGRESSION

Test representative Android/iOS device classes and configurations:

- small phones and large phones;
- multiple pixel densities and font scales;
- cutouts, status bars, safe areas, and home indicators;
- Android gesture navigation and three-button navigation;
- portrait orientation and keyboard-open forms;
- long localized labels and large accessibility text;
- offline, loading, error, and conflict states.

Use physical devices plus emulators/simulators; a single emulator size is insufficient.

------------------------------------------------------------------------

# 85. NATIVE PLATFORM TESTING

Test release-like builds on physical Android and iOS devices where available, plus simulators/emulators. Cover supported OS versions, app install/update, app termination/resume, permission denial, token rotation, offline transitions, keyboard/safe-area behavior, and store-signing configuration. Expo Go alone is not sufficient for validating native modules, push credentials, or release behavior.

------------------------------------------------------------------------

# 86. PERFORMANCE

The application must avoid:

-   unnecessary re-renders,
-   giant initial bundles,
-   duplicate network requests,
-   unbounded API responses,
-   unnecessary realtime listeners,
-   expensive repeated calculations.

Financial data should be queried efficiently.

------------------------------------------------------------------------

# 87. ACCESSIBILITY REGRESSION

Verify:

-   keyboard navigation,
-   focus,
-   modal focus trap/restore,
-   labels,
-   semantics,
-   contrast,
-   screen-reader names,
-   Escape behavior.

------------------------------------------------------------------------

# 88. IMPLEMENTATION PHASES

Implementation must not begin until the user approves this revised architecture and PRD.

## Phase 0 — Reference Audit

Inspect old ARTA features, UI, assets, flows, and business behavior. Do not modify it. Produce a feature parity matrix without copying legacy implementation architecture. Phase 0 also covers workspace-structure verification, Git boundaries, document consistency (PRD/AGENTS/roadmap), and reference-folder protection. Phase 1+ stays locked until the user approves this PRD and all Phase 0 gates pass.

Native Google Sign-In validation (OAuth Android/iOS config + account-linking rules), Apple Developer/signing/APNs credentials plus real-device/TestFlight testing, and Play Store/App Store compliance (B2/B3/B6) are phase technical/release work. None is claimed done without evidence; missing credentials or test devices MUST NOT produce fake config or fabricated test results.

## Phase 1 — Architecture Compatibility Spike

Validate Expo/EAS, TypeScript, Expo SQLite transactional behavior/migrations, secure storage, local notifications, native build configuration, and Laravel API connectivity. Document the Android remote-push limitation under the no-FCM rule. No Firebase workaround is allowed.

## Phase 2 — Foundation

Set up the native mobile app, Laravel API, MySQL, API v1, environment handling, CI, linting, test infrastructure, and reproducible development/release builds.

## Phase 3 — Authentication and Devices

Implement email/password, Google sign-in, verification, password reset, mobile token/session revocation, secure token storage, device listing, and logout current/all devices.

## Phase 4 — Database and Financial Domain

Implement server migrations, models, authorization policies, transactional domain services, and financial entities/rules.

## Phase 5 — Native UI Core

Implement native navigation, app shell, forms, dashboard, calendar, settings, native layouts, keyboard/safe-area behavior, and approved ARTA visual language.

## Phase 6 — SQLite Offline Engine

Implement local schema/migrations, repositories, atomic local mutations, operation queue, materialized state, tombstones, and crash-safe persistence.

## Phase 7 — Server Sync and Conflict Resolution

Implement operation endpoint, idempotency, version checks, change feed/cursors, reconciliation, conflict handling, and recovery tests.

## Phase 8 — Active-App Realtime

Implement Reverb transport where useful, reconnect handling, cursor reconciliation, and duplicate-event protection. The app must remain correct if realtime is unavailable.

## Phase 9 — Notifications

Implement notification rules/history, scheduler/queue, deduplication, APNs direct integration for iOS, local reminders for known/synced schedules, and in-app notification UI. Android server push beyond the documented baseline requires a separate approved non-FCM transport decision.

## Phase 10 — Import/Export

Implement CSV, JSON, XLSX, validation, preview, atomic import, duplicate detection, and idempotency.

## Phase 11 — Feature Parity and Native Polish

Compare feature flows with old ARTA. Fix native navigation, safe areas, keyboard behavior, touch targets, accessibility, and supported device-size issues without unnecessary redesign.

## Phase 12 — Security Hardening

Run authorization, data ownership, secret, dependency, mobile storage, API, token revocation, and backend security audits.

## Phase 13 — Full Test

Run unit, integration, financial invariant, offline, sync, conflict, notification, E2E, native platform, accessibility, and performance tests.

## Phase 14 — Production Readiness and Store Release

Verify deployment, backups/restore, monitoring, scheduler, queue, realtime, APNs, signed builds, privacy disclosures, store metadata, staged rollout, rollback, and production smoke tests.

------------------------------------------------------------------------

# 89. AGENT DEVELOPMENT WORKFLOW

AI coding agents must follow this sequence:

``` text
1. Inspect
2. Understand
3. Identify affected files
4. State root cause/design decision internally
5. Implement minimal scoped change
6. Run relevant tests
7. Run broader tests when appropriate
8. Review diff
9. Verify no unrelated changes
10. Verify PRD compliance
```

Do not make broad speculative changes.

Do not "improve" unrelated code while implementing a feature.

Do not redesign the application without explicit scope.

------------------------------------------------------------------------

# 90. CHANGE DISCIPLINE

Every change must be:

-   scoped,
-   explainable,
-   testable,
-   reversible.

If a fix requires touching multiple files, each file must have a direct
reason.

Do not modify files merely because an AI agent thinks they "might" be
relevant.

------------------------------------------------------------------------

# 91. NO AI SLOP RULE

The implementation must not contain generic AI-generated patterns such
as:

-   unnecessary gradients,
-   glassmorphism everywhere,
-   excessive cards,
-   excessive rounded containers,
-   huge hero sections,
-   decorative statistics with no purpose,
-   fake AI assistant elements,
-   sparkle icons,
-   meaningless animations,
-   excessive badges,
-   arbitrary colorful charts,
-   generic SaaS dashboard layouts.

ARTA must remain visually intentional.

------------------------------------------------------------------------

# 92. NO LEGACY ARCHITECTURE COPY

Even if the old ARTA contains working code, do not automatically copy:

-   Firebase,
-   Firestore,
-   old synchronization,
-   old service worker,
-   old notification backend,
-   old authentication architecture,
-   old data model,
-   old timestamp conflict handling.

Only behavior/UI/feature intent should be reused when compatible with
this PRD.

------------------------------------------------------------------------

# 93. DATA MIGRATION POLICY

There is no automatic legacy-data migration in the initial rebuild.

If migration is required later, it must be a separate project/tool with:

``` text
Parser
→ Mapping
→ Validation
→ Preview
→ Explicit confirmation
→ Import
→ Reconciliation
```

Never directly inject old database data into the new production
database.

------------------------------------------------------------------------

# 94. GIT POLICY

Keep Git history clean.

Do not commit:

-   secrets,
-   `.env`,
-   credentials,
-   generated sensitive files,
-   temporary audit artifacts,
-   unnecessary build output.

Prefer focused commits.

Do not mix:

-   UI redesign,
-   financial logic,
-   dependency upgrades,
-   unrelated refactors

in one implementation change.

------------------------------------------------------------------------

# 95. DOCUMENTATION

Required documentation:

-   root README,
-   mobile app README where useful,
-   backend README where useful,
-   environment variable documentation,
-   local development instructions,
-   production deployment instructions,
-   architecture documentation,
-   sync protocol documentation,
-   security documentation,
-   testing instructions.

Documentation must describe the actual implementation.

Do not write generic AI filler.

------------------------------------------------------------------------

# 96. DEFINITION OF DONE

A feature is NOT done merely because the UI exists.

A feature is done only when:

-   UI works,
-   native layout behavior works across supported devices,
-   backend works,
-   authorization works,
-   validation works,
-   financial integrity works,
-   offline behavior works where applicable,
-   sync behavior works,
-   realtime behavior works where applicable,
-   errors are handled,
-   tests pass,
-   accessibility is acceptable,
-   no unrelated regressions exist.

------------------------------------------------------------------------

# 97. FINAL RELEASE GATE

ARTA cannot be released until all required gates pass.

## Product

- feature parity against approved scope;
- all approved features implemented;
- no unauthorized removals.

## Financial

- balance and transaction integrity;
- atomic balance-changing operations;
- no negative normal accounts;
- reconciliation passes.

## Security

- authorization and ownership;
- authentication and token revocation;
- rate limiting and secret handling;
- safe errors and backup security;
- no Firebase/FCM SDKs or services.

## Offline and Sync

- native offline startup from SQLite;
- atomic local mutation + operation queue;
- retry and idempotency;
- crash safety;
- conflict detection, reconciliation, cursor handling, tombstones, and restore.

## Realtime

- Reverb is transport-only;
- reconnect and missed-event recovery;
- duplicate event handling.

## Notifications

- scheduler and queue;
- in-app history and deduplication;
- iOS direct APNs configuration and test;
- local reminders based on synced schedules;
- Android remote-push limitations accurately documented;
- daily reminder rules and device preferences tested.

## Native App

- signed Android and iOS builds;
- install/update/resume flows;
- SQLite migration and recovery;
- secure credential storage;
- safe-area, keyboard, TalkBack, and VoiceOver checks.

## UI/UX and Data Exchange

- ARTA visual language retained without AI slop;
- native device matrix passes;
- CSV, JSON, and XLSX validation, preview, atomic import, and idempotency.

## Operations

- backend deployment;
- queue, scheduler, and Reverb if retained;
- HTTPS, secrets, APNs config;
- encrypted backup and tested restore;
- monitoring and rollback;
- Google Play/App Store submission readiness.

------------------------------------------------------------------------

# 98. FINAL ACCEPTANCE CRITERIA

The project is accepted only if all of the following are true:

1. New ARTA is independently buildable as a native Android/iOS app.
2. Removing the old ARTA reference project does not break the new project.
3. Old ARTA remains unmodified.
4. No Firebase product, SDK, or FCM dependency exists.
5. No web/PWA frontend is required to use ARTA.
6. All approved product features exist.
7. Financial operations are atomic and server-authorized.
8. SQLite offline mutations are durable and queued atomically.
9. Operations are idempotent across retries.
10. Conflicts are detected rather than silently overwritten.
11. Reverb is transport-only and change feed supports reconciliation.
12. iOS APNs integration does not use Firebase.
13. Android notification capabilities and limitations match this PRD.
14. Notifications are deduplicated and reminder rules are deterministic within platform constraints.
15. Trash and restore work safely.
16. Import/export works safely.
17. Native layouts work across the supported Android/iOS device matrix.
18. VoiceOver and TalkBack accessibility baseline passes.
19. UI remains faithful to ARTA's visual language; no AI slop is introduced.
20. Security, financial integrity, offline, sync, and notification tests pass.
21. Production native builds and backend deployment succeed.
22. Backup and restore have been tested.
23. Rollback procedure is documented and tested where practical.
24. No silent data loss exists.

------------------------------------------------------------------------

# 99. MASTER DECISION HIERARCHY

When requirements conflict, use this order:

``` text
1. Security / Financial Integrity
2. Explicit PRD Decision
3. Business Rules
4. UI/UX Reference
5. Existing ARTA Behavior
6. AI Agent Assumption
```

AI agent assumptions are always the lowest priority.

If uncertain:

> STOP AND ASK FOR CLARIFICATION.

Do not invent a financial rule.

------------------------------------------------------------------------

# 100. FINAL AGENT COMMAND

Before modifying code, the AI coding agent must understand this:

> You are building a NEW ARTA application.
>
> The OLD ARTA project is REFERENCE ONLY.
>
> DO NOT MODIFY THE OLD ARTA PROJECT.
>
> DO NOT MAKE THE NEW ARTA DEPEND ON THE OLD PROJECT.
>
> DO NOT COPY FIREBASE OR LEGACY SYNC ARCHITECTURE.
>
> Preserve the approved ARTA UI/UX language and feature intent, but
> implement the native Android/iOS app, backend, database, authentication,
> SQLite offline engine, synchronization, active-app realtime, native/local
> notifications, APNs integration, and security according to this PRD.
>
> Financial integrity and security take priority over convenience.
>
> Never silently overwrite or delete financial data.
>
> Never use client timestamps as financial conflict authority.
>
> Never use Last Write Wins.
>
> Never guess when financial state is uncertain.
>
> Keep implementation scoped and testable.
>
> Do not introduce AI slop.
>
> Do not make unrelated changes.
>
> The new ARTA must remain independently buildable and runnable if the
> old reference project is removed.

------------------------------------------------------------------------

# END OF MASTER PRD

**Status:** Approved by user on 13 Okt 2026 (explicit approval in conversation)\
**Authority:** Single Source of Truth for ARTA New\
**Legacy Project:** Reference Only --- MUST NOT BE MODIFIED\
**Release Principle:** No Silent Data Loss + Financial Integrity First
