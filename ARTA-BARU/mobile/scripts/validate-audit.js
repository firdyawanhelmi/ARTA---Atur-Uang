const { execSync } = require('child_process');

const SEVERITY_LEVELS = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

// Approved explicit (package + GHSA ID) pairs from docs/T2-risiko-advisory-npm.md (Decision D-1).
// Each advisory MUST strictly match package name, approved GHSA identifier, and maximum approved severity.
const APPROVED_PACKAGE_ADVISORIES = {
  'braces:ghsa-vfj7-8cjw-p6xm': {
    package: 'braces',
    ghsaId: 'ghsa-vfj7-8cjw-p6xm',
    maxSeverity: 'high', // RR-1 (high) - BLOCKED upstream
  },
  'decode-uri-component:ghsa-vcc3-ghjq-m6fr': {
    package: 'decode-uri-component',
    ghsaId: 'ghsa-vcc3-ghjq-m6fr',
    maxSeverity: 'moderate', // RR-2 (moderate) - BLOCKED by CommonJS expo-router@57
  },
  'node-forge:ghsa-86w9-cpqp-85rv': {
    package: 'node-forge',
    ghsaId: 'ghsa-86w9-cpqp-85rv',
    maxSeverity: 'high', // RR-3 (high) - BLOCKED upstream
  },
};

// Backward-compatible iterator and helper for existing consumers
Object.defineProperty(APPROVED_PACKAGE_ADVISORIES, Symbol.iterator, {
  enumerable: false,
  value: function* () {
    yield* Object.keys(APPROVED_PACKAGE_ADVISORIES);
  },
});
Object.defineProperty(APPROVED_PACKAGE_ADVISORIES, 'has', {
  enumerable: false,
  value: function (key) {
    return Object.prototype.hasOwnProperty.call(
      APPROVED_PACKAGE_ADVISORIES,
      key,
    );
  },
});

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
      status: 'CLEAN',
      isClean: true,
      total: 0,
      totalNodes: 0,
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

      const approvedConfig = APPROVED_PACKAGE_ADVISORIES[pairKey];
      const advSeverity = (adv.severity || 'unknown').toLowerCase();
      const currentLevel = SEVERITY_LEVELS[advSeverity] ?? 99;
      const maxAllowedLevel = approvedConfig
        ? (SEVERITY_LEVELS[approvedConfig.maxSeverity] ?? -1)
        : -1;

      if (!ghsaId || !approvedConfig) {
        unapproved.push({
          package: pkgName,
          ghsaId: ghsaId,
          pairKey: pairKey,
          reason: 'Unapproved package or GHSA identifier',
          title: adv.title || 'Unknown title',
          severity: adv.severity || 'unknown',
          url: adv.url || 'No URL',
        });
      } else if (currentLevel > maxAllowedLevel) {
        unapproved.push({
          package: pkgName,
          ghsaId: ghsaId,
          pairKey: pairKey,
          reason: `Severity escalated from approved maximum "${approvedConfig.maxSeverity}" to "${adv.severity}"`,
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
      status: 'UNAPPROVED_FINDINGS',
      isClean: false,
      error: `Unapproved security vulnerabilities detected outside deferred findings (${unapproved.length} unapproved finding(s))`,
      unapproved,
    };
  }

  if (meta.total > 0 && detectedRoots.size === 0) {
    return {
      ok: false,
      status: 'MALFORMED_PAYLOAD',
      isClean: false,
      error: `Invalid audit payload: metadata reports ${meta.total} vulnerabilities, but no advisory roots were found in vulnerabilities map.`,
    };
  }

  return {
    ok: false,
    status: 'DEFERRED_OPEN_SECURITY_FINDINGS',
    isClean: false,
    total: meta.total,
    totalNodes: meta.total,
    detectedRoots: Array.from(detectedRoots),
    message: `STATUS: DEFERRED — OPEN SECURITY FINDINGS (${detectedRoots.size} unique root advisory(ies) covering ${meta.total} affected dependency node(s)).\nRemediation is deferred to Task T12.3 (Expo SDK 58). This is open technical debt; passing build/test checks does NOT imply dependencies are safe.`,
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
  if (result.status === 'CLEAN') {
    console.log('Audit clean: 0 vulnerabilities found.');
    process.exit(0);
  }

  if (result.status === 'DEFERRED_OPEN_SECURITY_FINDINGS') {
    console.log(
      `Active root advisories tracked under DEFERRED — OPEN SECURITY FINDINGS (${result.detectedRoots.length} unique root(s) across ${result.totalNodes || result.total} affected node(s)):`,
    );
    result.detectedRoots.forEach((r) => console.log(` - ${r}`));
    console.log(`\n${result.message}`);
    // Exits with code 1 so that security audit is explicitly recorded as having open findings (not masked as clean).
    process.exit(1);
  }

  console.error(`::error::${result.error}`);
  if (result.unapproved) {
    console.error(JSON.stringify(result.unapproved, null, 2));
  }
  process.exit(1);
}

if (require.main === module) {
  runAuditCli();
}

module.exports = {
  APPROVED_PACKAGE_ADVISORIES,
  SEVERITY_LEVELS,
  validateAudit,
  runAuditCli,
};
