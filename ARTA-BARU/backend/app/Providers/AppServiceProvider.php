<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Approved decision: 5 login attempts per minute per email+IP.
        // The key is normalized (trim + lowercase) so case/space variants
        // of one address share a bucket; lookup collation is
        // case-insensitive, so authentication behavior is unchanged.
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email')));

            return Limit::perMinute(5)->by($email.'|'.$request->ip());
        });

        // Registration shares the "stricter auth endpoints" tier (PRD),
        // keyed by IP only: emails rotate per attempt, so an email-scoped
        // key would be ineffective. Numbers mirror the login tier pending
        // an explicit per-endpoint decision.
        RateLimiter::for('register', function (Request $request) {
            return Limit::perMinute(5)->by($request->ip());
        });

        // Approved decision: verification links may be opened at most
        // 10 times per minute per IP (idempotent endpoint).
        RateLimiter::for('verify-email', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Resend limits: at most 3 sends per 15 minutes per account plus
        // at most 10 requests per minute per IP. The account key uses the
        // same normalization as the controller lookup.
        RateLimiter::for('resend-verification-account', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email')));

            return Limit::perMinutes(15, 3)->by('resend:'.$email);
        });

        RateLimiter::for('resend-verification-ip', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Password reset mirrors the resend pattern with separate buckets:
        // forgot-password 3/15min per account + 10/min per IP, and the same
        // pair for reset-password attempts (repeated guessing). Values are
        // documented here as the project pattern, not PRD numbers.
        foreach (['forgot-password', 'reset-password'] as $scope) {
            RateLimiter::for("{$scope}-account", function (Request $request) use ($scope) {
                $email = strtolower(trim((string) $request->input('email')));

                return Limit::perMinutes(15, 3)->by("{$scope}:".$email);
            });

            RateLimiter::for("{$scope}-ip", function (Request $request) {
                return Limit::perMinute(10)->by($request->ip());
            });
        }

        // Email change mirrors the resend pattern with its own buckets:
        // 3 requests per 15 minutes per authenticated account plus 10 per
        // minute per IP. The account key uses the stable user id (immune to
        // email-case games); the pending-link endpoint mirrors verify-email.
        RateLimiter::for('change-email-account', function (Request $request) {
            return Limit::perMinutes(15, 3)->by('change-email:'.$request->user()?->getKey());
        });

        RateLimiter::for('change-email-ip', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        RateLimiter::for('verify-pending-email', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Password change mirrors the change-email pattern: 3 requests per
        // 15 minutes per authenticated account plus 10 per minute per IP.
        // No password material is used in either key.
        RateLimiter::for('change-password-account', function (Request $request) {
            return Limit::perMinutes(15, 3)->by('change-password:'.$request->user()?->getKey());
        });

        RateLimiter::for('change-password-ip', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
    }
}
