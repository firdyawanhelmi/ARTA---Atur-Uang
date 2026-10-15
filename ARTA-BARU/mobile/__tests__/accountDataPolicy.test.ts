import {
  AccountDataPolicyError,
  checkAccountSwitchIsolation,
  getAccountDatabaseName,
} from '../src/auth/accountDataPolicy';

describe('accountDataPolicy (B5 SQLite data isolation)', () => {
  describe('getAccountDatabaseName', () => {
    it('returns an isolated db filename for a valid user UUID', () => {
      const userId = '0193e2a1-7c49-7a1b-9c2d-3f4a5b6c7d8e';
      const dbName = getAccountDatabaseName(userId);
      expect(dbName).toBe('arta_user_0193e2a1-7c49-7a1b-9c2d-3f4a5b6c7d8e.db');
    });

    it('normalizes uppercase UUIDs to lowercase', () => {
      const userId = '0193E2A1-7C49-7A1B-9C2D-3F4A5B6C7D8E';
      const dbName = getAccountDatabaseName(userId);
      expect(dbName).toBe('arta_user_0193e2a1-7c49-7a1b-9c2d-3f4a5b6c7d8e.db');
    });

    it('rejects empty or whitespace userId', () => {
      expect(() => getAccountDatabaseName('')).toThrow(AccountDataPolicyError);
      expect(() => getAccountDatabaseName('   ')).toThrow(
        AccountDataPolicyError,
      );
    });

    it('rejects path traversal attempts and invalid characters', () => {
      expect(() => getAccountDatabaseName('../secrets')).toThrow(
        AccountDataPolicyError,
      );
      expect(() => getAccountDatabaseName('user/id')).toThrow(
        AccountDataPolicyError,
      );
      expect(() => getAccountDatabaseName('user\\id')).toThrow(
        AccountDataPolicyError,
      );
      expect(() => getAccountDatabaseName('user;drop table')).toThrow(
        AccountDataPolicyError,
      );
    });
  });

  describe('checkAccountSwitchIsolation', () => {
    const userA = '0193e2a1-7c49-7a1b-9c2d-3f4a5b6c7d8e';
    const userB = '0193e2a1-7c49-7a1b-9c2d-aaaaaaaaaaaa';

    it('detects an account switch between two distinct users', () => {
      const result = checkAccountSwitchIsolation({
        previousUserId: userA,
        nextUserId: userB,
      });

      expect(result.isSwitch).toBe(true);
      expect(result.previousPartition).toBe(`arta_user_${userA}.db`);
      expect(result.nextPartition).toBe(`arta_user_${userB}.db`);
      expect(result.previousPartition).not.toBe(result.nextPartition);
    });

    it('recognizes identical user as no switch (session refresh / restore)', () => {
      const result = checkAccountSwitchIsolation({
        previousUserId: userA,
        nextUserId: userA,
      });

      expect(result.isSwitch).toBe(false);
      expect(result.previousPartition).toBe(`arta_user_${userA}.db`);
      expect(result.nextPartition).toBe(`arta_user_${userA}.db`);
    });

    it('recognizes initial login from signed-out state as no switch', () => {
      const result = checkAccountSwitchIsolation({
        previousUserId: null,
        nextUserId: userA,
      });

      expect(result.isSwitch).toBe(false);
      expect(result.previousPartition).toBeNull();
      expect(result.nextPartition).toBe(`arta_user_${userA}.db`);
    });
  });
});
