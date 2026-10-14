import {
  parseAppConfig,
  validateApiUrl,
  validateEnvironment,
} from '../src/config/env';

describe('Environment Helper (env.ts)', () => {
  describe('validateEnvironment', () => {
    it('defaults to development when input is undefined or empty', () => {
      expect(validateEnvironment()).toBe('development');
      expect(validateEnvironment('')).toBe('development');
    });

    it('accepts development, staging, and production', () => {
      expect(validateEnvironment('development')).toBe('development');
      expect(validateEnvironment('staging')).toBe('staging');
      expect(validateEnvironment('production')).toBe('production');
    });

    it('throws on unknown environment values', () => {
      expect(() => validateEnvironment('test')).toThrow(
        /Invalid environment "test"/,
      );
      expect(() => validateEnvironment('local')).toThrow(
        /Invalid environment "local"/,
      );
      expect(() => validateEnvironment('prod')).toThrow(
        /Invalid environment "prod"/,
      );
    });
  });

  describe('validateApiUrl', () => {
    it('returns empty string when url is empty or undefined', () => {
      expect(validateApiUrl()).toBe('');
      expect(validateApiUrl('')).toBe('');
      expect(validateApiUrl('   ')).toBe('');
    });

    it('accepts valid http and https URLs', () => {
      expect(validateApiUrl('http://10.0.2.2:8000')).toBe(
        'http://10.0.2.2:8000',
      );
      expect(validateApiUrl('https://api.arta.app')).toBe(
        'https://api.arta.app',
      );
    });

    it('returns the URL as-is without normalization', () => {
      expect(validateApiUrl('https://api.arta.app/v1/')).toBe(
        'https://api.arta.app/v1/',
      );
      expect(validateApiUrl('  https://api.arta.app  ')).toBe(
        'https://api.arta.app',
      );
    });

    it('throws when protocol is not http or https', () => {
      expect(() => validateApiUrl('ftp://example.com')).toThrow(
        /Invalid API URL protocol "ftp:"/,
      );
      expect(() => validateApiUrl('ws://example.com')).toThrow(
        /Invalid API URL protocol "ws:"/,
      );
    });

    it('throws when string is not a valid URL', () => {
      expect(() => validateApiUrl('not-a-url')).toThrow(/Invalid API URL/);
    });

    it('rejects URLs without a "//host" authority', () => {
      expect(() => validateApiUrl('http:foo')).toThrow(/Invalid API URL/);
      expect(() => validateApiUrl('http:/foo')).toThrow(/Invalid API URL/);
      expect(() => validateApiUrl('http:///path')).toThrow(/Invalid API URL/);
      expect(() => validateApiUrl('https:///path')).toThrow(/Invalid API URL/);
    });

    it('rejects URLs with a missing hostname', () => {
      expect(() => validateApiUrl('http://')).toThrow(/Invalid API URL/);
      expect(() => validateApiUrl('https://')).toThrow(/Invalid API URL/);
      expect(() => validateApiUrl('http://?q=1')).toThrow(/Invalid API URL/);
      expect(() => validateApiUrl('http://#frag')).toThrow(/Invalid API URL/);
      expect(() => validateApiUrl('http://:8000')).toThrow(/Invalid API URL/);
    });

    it('rejects URLs with an invalid port', () => {
      expect(() => validateApiUrl('http://example.com:abc')).toThrow(
        /Invalid API URL/,
      );
      expect(() => validateApiUrl('http://example.com:99999')).toThrow(
        /Invalid API URL/,
      );
      expect(() => validateApiUrl('http://example.com:65536')).toThrow(
        /Invalid API URL/,
      );
    });

    it('rejects http when allowHttp is false but keeps https', () => {
      expect(() =>
        validateApiUrl('http://10.0.2.2:8000', { allowHttp: false }),
      ).toThrow(/HTTP is not allowed/);
      expect(validateApiUrl('https://api.arta.app', { allowHttp: false })).toBe(
        'https://api.arta.app',
      );
    });
  });

  describe('parseAppConfig', () => {
    it('produces correct flags for development', () => {
      const config = parseAppConfig('development', '');
      expect(config.env).toBe('development');
      expect(config.isDevelopment).toBe(true);
      expect(config.isStaging).toBe(false);
      expect(config.isProduction).toBe(false);
      expect(config.apiUrl).toBe('');
    });

    it('produces correct flags for staging', () => {
      const config = parseAppConfig('staging', 'https://staging.arta.app');
      expect(config.env).toBe('staging');
      expect(config.isDevelopment).toBe(false);
      expect(config.isStaging).toBe(true);
      expect(config.isProduction).toBe(false);
      expect(config.apiUrl).toBe('https://staging.arta.app');
    });

    it('produces correct flags for production', () => {
      const config = parseAppConfig('production', 'https://api.arta.app');
      expect(config.env).toBe('production');
      expect(config.isDevelopment).toBe(false);
      expect(config.isStaging).toBe(false);
      expect(config.isProduction).toBe(true);
      expect(config.apiUrl).toBe('https://api.arta.app');
    });

    it('allows http URLs in development and staging', () => {
      expect(parseAppConfig('development', 'http://10.0.2.2:8000').apiUrl).toBe(
        'http://10.0.2.2:8000',
      );
      expect(parseAppConfig('staging', 'http://10.0.2.2:8000').apiUrl).toBe(
        'http://10.0.2.2:8000',
      );
    });

    it('rejects http URLs in production', () => {
      expect(() =>
        parseAppConfig('production', 'http://10.0.2.2:8000'),
      ).toThrow(/HTTP is not allowed/);
    });

    it('rejects an empty API URL in production', () => {
      expect(() => parseAppConfig('production', '')).toThrow(
        /EXPO_PUBLIC_API_URL/,
      );
      expect(() => parseAppConfig('production', '   ')).toThrow(
        /EXPO_PUBLIC_API_URL/,
      );
      expect(() => parseAppConfig('production')).toThrow(/EXPO_PUBLIC_API_URL/);
    });

    it('allows an empty API URL in development and staging', () => {
      expect(parseAppConfig('development', '').apiUrl).toBe('');
      expect(parseAppConfig('staging', '').apiUrl).toBe('');
    });

    it('defaults to development locally when the environment is missing', () => {
      expect(parseAppConfig(undefined, undefined, { dev: true }).env).toBe(
        'development',
      );
      expect(parseAppConfig('', '', { dev: true }).env).toBe('development');
      // Relies on Jest providing __DEV__ === true, like a dev bundle.
      expect(parseAppConfig(undefined, undefined).env).toBe('development');
    });

    it('refuses to default in a production bundle when the environment is missing', () => {
      expect(() =>
        parseAppConfig(undefined, undefined, { dev: false }),
      ).toThrow(/EXPO_PUBLIC_ENV/);
      expect(() => parseAppConfig('', '', { dev: false })).toThrow(
        /EXPO_PUBLIC_ENV/,
      );
      expect(() =>
        parseAppConfig('   ', 'https://api.arta.app', { dev: false }),
      ).toThrow(/EXPO_PUBLIC_ENV/);
    });

    it('throws on an explicit but unknown environment', () => {
      expect(() => parseAppConfig('prod', 'https://api.arta.app')).toThrow(
        /Invalid environment/,
      );
    });
  });
});
