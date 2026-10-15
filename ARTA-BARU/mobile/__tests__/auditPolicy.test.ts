import {
  validateAudit,
  APPROVED_PACKAGE_ADVISORIES,
} from '../scripts/validate-audit';

describe('Audit Policy Validator (Decision D-1 Enforcement)', () => {
  // Scenario 1: Tiga GHSA yang masih aktif dikenali dengan status DEFERRED — OPEN SECURITY FINDINGS
  it('Scenario 1: identifies the three active root pairs with DEFERRED_OPEN_SECURITY_FINDINGS status', () => {
    const payload = {
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 3,
          high: 49,
          critical: 0,
          total: 52,
        },
      },
      vulnerabilities: {
        braces: {
          name: 'braces',
          severity: 'high',
          via: [
            {
              source: 1240992,
              name: 'braces',
              title: 'braces stack exhaustion',
              url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
              severity: 'high',
            },
          ],
        },
        'decode-uri-component': {
          name: 'decode-uri-component',
          severity: 'moderate',
          via: [
            {
              source: 1147955,
              name: 'decode-uri-component',
              title: 'decode-uri-component DoS',
              url: 'https://github.com/advisories/GHSA-vcc3-ghjq-m6fr',
              severity: 'moderate',
            },
          ],
        },
        'node-forge': {
          name: 'node-forge',
          severity: 'high',
          via: [
            {
              source: 1240912,
              name: 'node-forge',
              title: 'node-forge RSA PKCS#1 v1.5 verification',
              url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
              severity: 'high',
            },
          ],
        },
      },
    };

    const result = validateAudit(payload);
    expect(result.ok).toBe(false);
    expect(result.status).toBe('DEFERRED_OPEN_SECURITY_FINDINGS');
    expect(result.isClean).toBe(false);
    expect(result.total).toBe(52);
    expect(result.detectedRoots).toHaveLength(3);
    expect(result.detectedRoots).toEqual(
      expect.arrayContaining(Object.keys(APPROVED_PACKAGE_ADVISORIES)),
    );
    expect(result.message).toContain(
      'STATUS: DEFERRED — OPEN SECURITY FINDINGS',
    );
  });

  // Scenario 1b: Paket yang sudah diremediasi (sprintf-js dan uuid) ditolak jika muncul kembali
  it('Scenario 1b: rejects remediated advisories (sprintf-js and uuid) if reintroduced', () => {
    const remediatedPairs = [
      {
        pkg: 'sprintf-js',
        source: 1241202,
        title: 'sprintf-js DoS',
        url: 'https://github.com/advisories/GHSA-hp3w-g68c-fv3c',
        severity: 'moderate',
      },
      {
        pkg: 'uuid',
        source: 1119441,
        title: 'uuid buffer bounds check',
        url: 'https://github.com/advisories/GHSA-w5hq-g745-h8pq',
        severity: 'moderate',
      },
    ];

    for (const item of remediatedPairs) {
      const payload = {
        metadata: {
          vulnerabilities: {
            total: 1,
            critical: 0,
            high: 0,
            moderate: 1,
            low: 0,
            info: 0,
          },
        },
        vulnerabilities: {
          [item.pkg]: {
            name: item.pkg,
            severity: item.severity,
            via: [item],
          },
        },
      };

      const result = validateAudit(payload);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(
        /Unapproved security vulnerabilities detected/,
      );
      expect(result.unapproved).toHaveLength(1);
      expect(result.unapproved![0]).toMatchObject({
        package: item.pkg,
      });
    }
  });

  // Scenario 2: GHSA baru pada paket yang sudah diizinkan harus gagal (FAIL)
  it('Scenario 2: rejects an unapproved GHSA on an approved package name', () => {
    const payload = {
      metadata: {
        vulnerabilities: {
          total: 1,
          critical: 0,
          high: 1,
          moderate: 0,
          low: 0,
          info: 0,
        },
      },
      vulnerabilities: {
        braces: {
          name: 'braces',
          severity: 'high',
          via: [
            {
              source: 9999999,
              name: 'braces',
              title: 'Hypothetical new RCE in braces',
              url: 'https://github.com/advisories/GHSA-9999-9999-9999',
              severity: 'high',
            },
          ],
        },
      },
    };

    const result = validateAudit(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(
      /Unapproved security vulnerabilities detected/,
    );
    expect(result.unapproved).toHaveLength(1);
    expect(result.unapproved![0]).toMatchObject({
      package: 'braces',
      ghsaId: 'ghsa-9999-9999-9999',
    });
  });

  // Scenario 3: GHSA baru pada paket lain harus gagal (FAIL)
  it('Scenario 3: rejects a vulnerability on an unapproved package', () => {
    const payload = {
      metadata: {
        vulnerabilities: {
          total: 1,
          critical: 0,
          high: 1,
          moderate: 0,
          low: 0,
          info: 0,
        },
      },
      vulnerabilities: {
        lodash: {
          name: 'lodash',
          severity: 'high',
          via: [
            {
              source: 8888888,
              name: 'lodash',
              title: 'Prototype pollution in lodash',
              url: 'https://github.com/advisories/GHSA-xxxx-xxxx-xxxx',
              severity: 'high',
            },
          ],
        },
      },
    };

    const result = validateAudit(payload);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(
      /Unapproved security vulnerabilities detected/,
    );
    expect(result.unapproved).toHaveLength(1);
    expect(result.unapproved![0]).toMatchObject({
      package: 'lodash',
      ghsaId: 'ghsa-xxxx-xxxx-xxxx',
    });
  });

  // Scenario 4: Vulnerability critical harus gagal (FAIL)
  it('Scenario 4: immediately rejects any payload with critical vulnerabilities', () => {
    // 4a: Critical reported in metadata
    const payloadMetaCritical = {
      metadata: {
        vulnerabilities: {
          total: 1,
          critical: 1,
          high: 0,
          moderate: 0,
          low: 0,
          info: 0,
        },
      },
      vulnerabilities: {
        braces: {
          name: 'braces',
          severity: 'critical',
          via: [
            {
              source: 1240992,
              name: 'braces',
              title: 'braces escalated to critical',
              url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
              severity: 'critical',
            },
          ],
        },
      },
    };

    const resultMeta = validateAudit(payloadMetaCritical);
    expect(resultMeta.ok).toBe(false);
    expect(resultMeta.error).toMatch(/Critical vulnerabilities detected/);

    // 4b: Critical on advisory level even if metadata claims critical: 0
    const payloadAdvCritical = {
      metadata: {
        vulnerabilities: {
          total: 1,
          critical: 0,
          high: 1,
          moderate: 0,
          low: 0,
          info: 0,
        },
      },
      vulnerabilities: {
        braces: {
          name: 'braces',
          severity: 'critical',
          via: [
            {
              source: 1240992,
              name: 'braces',
              title: 'braces escalated to critical',
              url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
              severity: 'critical',
            },
          ],
        },
      },
    };

    const resultAdv = validateAudit(payloadAdvCritical);
    expect(resultAdv.ok).toBe(false);
    expect(resultAdv.error).toMatch(/Critical severity/);
  });

  // Scenario 5: Audit tanpa vulnerability harus lolos (PASS / CLEAN)
  it('Scenario 5: passes cleanly when zero vulnerabilities exist', () => {
    const payload = {
      metadata: {
        vulnerabilities: {
          total: 0,
          critical: 0,
          high: 0,
          moderate: 0,
          low: 0,
          info: 0,
        },
      },
      vulnerabilities: {},
    };

    const result = validateAudit(payload);
    expect(result.ok).toBe(true);
    expect(result.status).toBe('CLEAN');
    expect(result.isClean).toBe(true);
    expect(result.total).toBe(0);
    expect(result.message).toMatch(/Audit clean: 0 vulnerabilities found/);
  });

  // Scenario 6: Output audit JSON tidak valid harus gagal (FAIL)
  it('Scenario 6: rejects invalid or malformed audit JSON payloads', () => {
    // null or undefined
    expect(validateAudit(null as any).ok).toBe(false);
    expect(validateAudit(undefined as any).ok).toBe(false);

    // empty object / missing metadata
    expect(validateAudit({} as any).ok).toBe(false);
    expect(validateAudit({ metadata: {} } as any).ok).toBe(false);

    // missing or non-number metadata fields
    expect(
      validateAudit({
        metadata: {
          vulnerabilities: { total: 'invalid' as any, critical: 0 },
        },
      } as any).ok,
    ).toBe(false);

    // missing vulnerabilities map
    expect(
      validateAudit({
        metadata: {
          vulnerabilities: { total: 0, critical: 0 },
        },
      } as any).ok,
    ).toBe(false);

    // malformed vulnerability entry or non-array via
    expect(
      validateAudit({
        metadata: {
          vulnerabilities: { total: 1, critical: 0 },
        },
        vulnerabilities: {
          braces: null as any,
        },
      } as any).ok,
    ).toBe(false);

    expect(
      validateAudit({
        metadata: {
          vulnerabilities: { total: 1, critical: 0 },
        },
        vulnerabilities: {
          braces: { via: 'not-an-array' as any },
        },
      } as any).ok,
    ).toBe(false);

    // advisory without valid GHSA / source ID
    const missingIdResult = validateAudit({
      metadata: {
        vulnerabilities: { total: 1, critical: 0 },
      },
      vulnerabilities: {
        braces: {
          name: 'braces',
          via: [
            {
              title: 'Advisory without URL or source ID',
            },
          ],
        },
      },
    } as any);
    expect(missingIdResult.ok).toBe(false);
    expect(missingIdResult.error).toMatch(
      /Unapproved security vulnerabilities/,
    );
    expect(missingIdResult.unapproved![0].ghsaId).toBeNull();

    // metadata reports total > 0 but zero root advisories found
    const zeroRootsResult = validateAudit({
      metadata: {
        vulnerabilities: { total: 5, critical: 0 },
      },
      vulnerabilities: {},
    });
    expect(zeroRootsResult.ok).toBe(false);
    expect(zeroRootsResult.error).toMatch(/no advisory roots were found/);
  });

  // Scenario 7: Eskalasi severity pada advisory dengan batas Moderate (Moderate -> High) harus gagal (FAIL)
  describe('Scenario 7: rejects severity escalation above approved maximum for Moderate advisory', () => {
    const moderateAdvisories = [
      {
        pkg: 'decode-uri-component',
        source: 1147955,
        ghsa: 'ghsa-vcc3-ghjq-m6fr',
        ref: 'RR-2',
      },
    ];

    test.each(moderateAdvisories)(
      'rejects when $pkg ($ref) escalates from moderate to high',
      ({ pkg, source, ghsa }) => {
        const payload = {
          metadata: {
            vulnerabilities: {
              total: 1,
              critical: 0,
              high: 1,
              moderate: 0,
              low: 0,
              info: 0,
            },
          },
          vulnerabilities: {
            [pkg]: {
              name: pkg,
              severity: 'high',
              via: [
                {
                  source,
                  name: pkg,
                  title: `${pkg} escalated to high severity`,
                  url: `https://github.com/advisories/${ghsa}`,
                  severity: 'high',
                },
              ],
            },
          },
        };

        const result = validateAudit(payload);
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(
          /Unapproved security vulnerabilities detected/,
        );
        expect(result.unapproved).toHaveLength(1);
        expect(result.unapproved![0]).toMatchObject({
          package: pkg,
          ghsaId: ghsa,
          severity: 'high',
        });
        expect(result.unapproved![0].reason).toMatch(
          /Severity escalated from approved maximum "moderate" to "high"/,
        );
      },
    );
  });

  // Scenario 8: Membedakan advisory unik dari total node dan menyatakan risiko terbuka
  it('Scenario 8: distinguishes unique root count from affected node count and states open risk', () => {
    const payload = {
      metadata: {
        vulnerabilities: {
          info: 0,
          low: 0,
          moderate: 3,
          high: 49,
          critical: 0,
          total: 52,
        },
      },
      vulnerabilities: {
        braces: {
          name: 'braces',
          severity: 'high',
          via: [
            {
              source: 1240992,
              name: 'braces',
              title: 'braces stack exhaustion',
              url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
              severity: 'high',
            },
          ],
        },
        'decode-uri-component': {
          name: 'decode-uri-component',
          severity: 'moderate',
          via: [
            {
              source: 1147955,
              name: 'decode-uri-component',
              title: 'decode-uri-component DoS',
              url: 'https://github.com/advisories/GHSA-vcc3-ghjq-m6fr',
              severity: 'moderate',
            },
          ],
        },
        'node-forge': {
          name: 'node-forge',
          severity: 'high',
          via: [
            {
              source: 1240912,
              name: 'node-forge',
              title: 'node-forge RSA PKCS#1 v1.5 verification',
              url: 'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
              severity: 'high',
            },
          ],
        },
      },
    };

    const result = validateAudit(payload);
    expect(result.ok).toBe(false);
    expect(result.status).toBe('DEFERRED_OPEN_SECURITY_FINDINGS');
    expect(result.isClean).toBe(false);
    expect(result.totalNodes).toBe(52);
    expect(result.detectedRoots).toHaveLength(3);
    expect(result.message).toContain('3 unique root advisory(ies)');
    expect(result.message).toContain('52 affected dependency node(s)');
    expect(result.message).toContain(
      'STATUS: DEFERRED — OPEN SECURITY FINDINGS',
    );
  });
});
