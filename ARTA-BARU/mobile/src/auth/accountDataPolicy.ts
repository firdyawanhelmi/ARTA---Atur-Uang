/**
 * Account data isolation and local database partition policy (B5 - DECIDED).
 *
 * Source: `ARTA-TASK-ROADMAP.md` task T3.3, `AGENTS.md` section 13, and
 * `backend/docs/auth-decisions.md`.
 *
 * Rules:
 * 1. Single Active Account: The client only holds session credentials for at
 *    most one authenticated user at a time in SecureStore.
 * 2. SQLite Database Partitioning: Each user's local relational database
 *    is strictly partitioned by their unique user UUID (`arta_user_<userId>.db`).
 *    User B never opens, reads, mutates, or syncs User A's database partition.
 * 3. Logout / Account Switch:
 *    - Plain logout clears local credentials from SecureStore and revokes
 *      the server session; it NEVER deletes financial data on the server.
 *    - On account switch, in-memory caches and active database connections
 *      are reset so the new account cannot read the prior account's state.
 *    - Any offline pending mutations are kept safely locked in that user's
 *      isolated partition until the SAME account logs back in to reconcile.
 */

const SAFE_ID_PATTERN = /^[0-9a-fA-F-]+$/;

export class AccountDataPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountDataPolicyError';
  }
}

/**
 * Returns the isolated SQLite database file name for the given authenticated user.
 *
 * Throws `AccountDataPolicyError` if the userId is empty, non-string, or
 * contains unsafe characters (e.g. path traversal attempts).
 */
export function getAccountDatabaseName(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new AccountDataPolicyError(
      'Cannot resolve database partition: user ID is missing or invalid.',
    );
  }

  const trimmed = userId.trim();
  if (!SAFE_ID_PATTERN.test(trimmed)) {
    throw new AccountDataPolicyError(
      'Cannot resolve database partition: user ID contains invalid characters.',
    );
  }

  return `arta_user_${trimmed.toLowerCase()}.db`;
}

export interface AccountSwitchContext {
  previousUserId: string | null;
  nextUserId: string;
}

/**
 * Validates whether an account switch has occurred and confirms partition isolation.
 */
export function checkAccountSwitchIsolation(context: AccountSwitchContext): {
  isSwitch: boolean;
  previousPartition: string | null;
  nextPartition: string;
} {
  const nextPartition = getAccountDatabaseName(context.nextUserId);
  const previousPartition = context.previousUserId
    ? getAccountDatabaseName(context.previousUserId)
    : null;

  const isSwitch =
    previousPartition !== null && previousPartition !== nextPartition;

  return {
    isSwitch,
    previousPartition,
    nextPartition,
  };
}
