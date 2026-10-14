const { execSync } = require('child_process');

// Approved explicit (package + GHSA ID) pairs from docs/T2-risiko-advisory-npm.md (Decision D-1).
// Each advisory MUST strictly match both the exact package name AND the approved GHSA identifier.
const APPROVED_PACKAGE_ADVISORIES = new Set([
  'braces:ghsa-vfj7-8cjw-p6xm', // RR-1 (high)
  'decode-uri-component:ghsa-vcc3-ghjq-m6fr', // RR-2 (moderate)
  'node-forge:ghsa-86w9-cpqp-85rv', // RR-3 (high)
  'sprintf-js:ghsa-hp3w-g68c-fv3c', // RR-4 (moderate)
  'uuid:ghsa-w5hq-g745-h8pq', // RR-5 (moderate)
]);

function validateAudit(auditJson) {
  if (!auditJson || typeof auditJson !== 'object') {
    return {
      ok: false,
      error: 'Invalid audit payload: payload is null or not an object',
    };
  }

  const meta = auditJson.metadata && auditJson.metadata.vulnerabilities;
  if (!meta || typeof meta !== 'object') {
    return {
      ok: false,
      error:
        'Invalid audit payload: missing or malformed metadata.vulnerabilities',
    };
  }

  if (typeof meta.total !== 'number' || typeof meta.critical !== 'number') {
    return {
      ok: false,
      error:
        'Invalid audit payload: metadata.vulnerabilities.total or critical is not a number',
    };
  }

  if (
    !auditJson.vulnerabilities ||
    typeof auditJson.vulnerabilities !== 'object'
  ) {
    return {
      ok: false,
      error: 'Invalid audit payload: missing or malformed vulnerabilities map',
    };
  }

  if (meta.critical > 0) {
    return {
      ok: false,
      error: `Critical vulnerabilities detected (${meta.critical})! Pipeline fails immediately on critical risk.`,
    };
  }

  if (meta.total === 0) {
    return {
      ok: true,
      total: 0,
      detectedRoots: [],
      message: 'Audit clean: 0 vulnerabilities found.',
    };
  }

  const unapproved = [];
  const detectedRoots = new Set();

  for (const [pkgName, vuln] of Object.entries(auditJson.vulnerabilities)) {
    if (!vuln || typeof vuln !== 'object') {
      return {
        ok: false,
        error: `Invalid audit payload: vulnerability entry for "${pkgName}" is malformed`,
      };
    }

    if (!Array.isArray(vuln.via)) {
      return {
        ok: false,
        error: `Invalid audit payload: vulnerability.via for "${pkgName}" is not an array`,
      };
    }

    if (vuln.severity === 'critical') {
      return {
        ok: false,
        error: `Critical severity detected on package "${pkgName}"! Pipeline fails immediately on critical risk.`,
      };
    }

    const directAdvisories = vuln.via.filter(
      (v) => typeof v === 'object' && v !== null,
    );
    for (const adv of directAdvisories) {
      if (adv.severity === 'critical') {
        return {
          ok: false,
          error: `Critical severity advisory detected on package "${pkgName}"! Pipeline fails immediately on critical risk.`,
        };
      }

      let ghsaId = null;
      if (adv.url && typeof adv.url === 'string') {
        const match = adv.url.match(/GHSA-[a-z0-9-]+/i);
        if (match) {
          ghsaId = match[0].toLowerCase();
        }
      }
      if (!ghsaId && adv.source) {
        ghsaId = String(adv.source).toLowerCase();
      }

      const pairKey = `${pkgName.toLowerCase()}:${ghsaId}`;
      if (ghsaId) {
        detectedRoots.add(pairKey);
      }

      if (!ghsaId || !APPROVED_PACKAGE_ADVISORIES.has(pairKey)) {
        unapproved.push({
          package: pkgName,
          ghsaId: ghsaId,
          pairKey: pairKey,
          title: adv.title || 'Unknown title',
          severity: adv.severity || 'unknown',
          url: adv.url || 'No URL',
        });
      }
    }
  }

  if (unapproved.length > 0) {
    return {
      ok: false,
      error: `Unapproved security vulnerabilities detected outside Decision D-1 baseline (${unapproved.length} unapproved finding(s))`,
      unapproved,
    };
  }

  if (meta.total > 0 && detectedRoots.size === 0) {
    return {
      ok: false,
      error: `Invalid audit payload: metadata reports ${meta.total} vulnerabilities, but no advisory roots were found in vulnerabilities map.`,
    };
  }

  return {
    ok: true,
    total: meta.total,
    detectedRoots: Array.from(detectedRoots),
    message: `POLICY ENFORCED: All ${meta.total} vulnerabilities match approved temporary risk acceptance D-1 (RR-1 to RR-5 in docs/T2-risiko-advisory-npm.md). No unapproved vulnerabilities found.`,
  };
}

function runAuditCli(cwd = process.cwd()) {
  console.log('--- BEGIN NPM AUDIT REPORT ---');
  let humanReport = '';
  try {
    humanReport = execSync('npm audit --audit-level=moderate', {
      cwd,
      encoding: 'utf8',
    });
  } catch (err) {
    humanReport = err.stdout ? err.stdout.toString() : '';
    if (!humanReport && err.stderr) {
      humanReport = err.stderr.toString();
    }
  }
  console.log(humanReport.trim());
  console.log('--- END NPM AUDIT REPORT ---\n');

  let auditJson;
  try {
    const raw = execSync('npm audit --json', {
      cwd,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    });
    if (!raw || !raw.trim()) {
      console.error('::error::npm audit --json returned empty output');
      process.exit(1);
    }
    auditJson = JSON.parse(raw);
  } catch (err) {
    if (err.stdout && err.stdout.toString().trim()) {
      try {
        auditJson = JSON.parse(err.stdout.toString());
      } catch (parseErr) {
        console.error(
          '::error::Failed to parse npm audit JSON output:',
          parseErr.message,
        );
        process.exit(1);
      }
    } else {
      console.error(
        '::error::Failed to execute npm audit --json:',
        err.message,
      );
      if (err.stderr) {
        console.error(err.stderr.toString());
      }
      process.exit(1);
    }
  }

  const result = validateAudit(auditJson);
  if (!result.ok) {
    console.error(`::error::${result.error}`);
    if (result.unapproved) {
      console.error(JSON.stringify(result.unapproved, null, 2));
    }
    process.exit(1);
  }

  console.log(
    'Root advisories verified against approved baseline (Decision D-1):',
  );
  result.detectedRoots.forEach((r) => console.log(` - ${r}`));
  console.log(`\n${result.message}`);
  process.exit(0);
}

if (require.main === module) {
  runAuditCli();
}

module.exports = {
  APPROVED_PACKAGE_ADVISORIES,
  validateAudit,
  runAuditCli,
};
