export type AppEnvironment = 'development' | 'staging' | 'production';

export interface AppConfig {
  env: AppEnvironment;
  apiUrl: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
}

export interface ValidateApiUrlOptions {
  /**
   * When false, `http:` URLs are rejected. Defaults to true so local
   * development (e.g. http://10.0.2.2:8000) keeps working; production
   * resolution passes false.
   */
  allowHttp?: boolean;
}

export interface ParseAppConfigOptions {
  /**
   * Test-only override for the bundler-provided __DEV__ flag.
   * Leave undefined in app code so the real bundle flag applies.
   */
  dev?: boolean;
}

// Provided by the React Native / Metro runtime: true in development
// bundles (including Jest), false in production bundles.
declare const __DEV__: boolean | undefined;

const VALID_ENVIRONMENTS: readonly AppEnvironment[] = [
  'development',
  'staging',
  'production',
];

export function validateEnvironment(rawEnv?: string): AppEnvironment {
  const env = (rawEnv || 'development').trim();

  if (!VALID_ENVIRONMENTS.includes(env as AppEnvironment)) {
    throw new Error(
      `Invalid environment "${env}". Expected one of: ${VALID_ENVIRONMENTS.join(
        ', ',
      )}.`,
    );
  }

  return env as AppEnvironment;
}

export function validateApiUrl(
  rawUrl?: string,
  options?: ValidateApiUrlOptions,
): string {
  if (!rawUrl || rawUrl.trim() === '') {
    return '';
  }

  const trimmed = rawUrl.trim();
  const allowHttp = options?.allowHttp ?? true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(
        `Invalid API URL protocol "${parsed.protocol}". Expected "http:" or "https:".`,
      );
    }
    if (parsed.protocol === 'http:' && !allowHttp) {
      throw new Error(
        `Invalid API URL "${trimmed}". HTTP is not allowed; use "https:".`,
      );
    }
    // WHATWG URL accepts inputs without a real "//host" authority (e.g.
    // "http:foo", "http:/foo") and normalizes some malformed authorities
    // (e.g. "http:///path" yields hostname "path"), so require the literal
    // authority separator and a non-empty host in the raw string. The input
    // is returned as-is; no normalization is performed.
    const schemePrefix = `${parsed.protocol}//`;
    if (!trimmed.toLowerCase().startsWith(schemePrefix)) {
      throw new Error(
        `Invalid API URL "${trimmed}". Expected format "http(s)://<host>[:port][/path]".`,
      );
    }
    const authority = trimmed.slice(schemePrefix.length);
    if (
      authority === '' ||
      authority.startsWith('/') ||
      authority.startsWith('?') ||
      authority.startsWith('#') ||
      parsed.hostname === ''
    ) {
      throw new Error(`Invalid API URL "${trimmed}". Missing hostname.`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid API URL')) {
      throw error;
    }
    throw new Error(
      `Invalid API URL "${trimmed}". Must be a valid HTTP or HTTPS URL.`,
    );
  }

  return trimmed;
}

function resolveIsDev(override?: boolean): boolean {
  if (override !== undefined) {
    return override;
  }
  if (typeof __DEV__ !== 'undefined') {
    return __DEV__;
  }
  // Fail closed: an unknown bundle type must not silently use the
  // development default.
  return false;
}

export function parseAppConfig(
  rawEnv?: string,
  rawApiUrl?: string,
  options?: ParseAppConfigOptions,
): AppConfig {
  const isDev = resolveIsDev(options?.dev);
  const rawEnvMissing = rawEnv === undefined || rawEnv.trim() === '';

  if (rawEnvMissing && !isDev) {
    throw new Error(
      'Missing EXPO_PUBLIC_ENV in a production bundle. Set EXPO_PUBLIC_ENV explicitly (expected "production" for release builds) instead of relying on the development default.',
    );
  }

  const env = validateEnvironment(rawEnv);
  const apiUrl = validateApiUrl(rawApiUrl, { allowHttp: env !== 'production' });

  if (env === 'production' && apiUrl === '') {
    throw new Error(
      'Missing EXPO_PUBLIC_API_URL for the production environment. Set a valid HTTPS URL instead of leaving it empty.',
    );
  }

  return {
    env,
    apiUrl,
    isDevelopment: env === 'development',
    isStaging: env === 'staging',
    isProduction: env === 'production',
  };
}

// Static property access required for Expo / Metro compile-time string replacement
export const env: AppConfig = parseAppConfig(
  process.env.EXPO_PUBLIC_ENV,
  process.env.EXPO_PUBLIC_API_URL,
);
