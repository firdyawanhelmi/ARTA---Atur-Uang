<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Convert users.id (and every user reference) from bigint to UUID v7
     * per PRD §43. Order matters: drop constraints -> widen columns ->
     * remap data -> restore keys. Runs cleanly on empty tables (loops are
     * no-ops) and preserves all linkages on tables with data. The
     * framework `sessions` table is intentionally untouched (no FK,
     * unused by token auth; see report).
     */
    public function up(): void
    {
        Schema::table('device_sessions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropIndex(['tokenable_type', 'tokenable_id']);
        });

        // Native MODIFY keeps existing keys while changing types (the
        // auto-increment attribute on users.id is dropped implicitly).
        Schema::table('users', function (Blueprint $table) {
            $table->char('id', 36)->change();
        });
        Schema::table('device_sessions', function (Blueprint $table) {
            $table->char('user_id', 36)->change();
        });
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->string('tokenable_id', 36)->change();
        });
        Schema::table('security_audit_logs', function (Blueprint $table) {
            $table->string('user_id', 36)->nullable()->change();
        });

        foreach (DB::table('users')->orderBy('id')->pluck('id') as $oldId) {
            $uuid = (string) Str::uuid7();

            DB::table('device_sessions')->where('user_id', $oldId)->update(['user_id' => $uuid]);
            DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $oldId)
                ->update(['tokenable_id' => $uuid]);
            DB::table('security_audit_logs')->where('user_id', $oldId)->update(['user_id' => $uuid]);
            DB::table('users')->where('id', $oldId)->update(['id' => $uuid]);
        }

        Schema::table('device_sessions', function (Blueprint $table) {
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->index(['tokenable_type', 'tokenable_id']);
        });
    }

    /**
     * Intentionally irreversible: restoring sequential integer ids would
     * silently corrupt every remapped linkage. Roll back only on databases
     * whose data may be discarded; tests use migrate:fresh instead.
     */
    public function down(): void
    {
        throw new RuntimeException(
            'Irreversible migration: users.id was converted to UUID v7 and original integer ids cannot be recovered.'
        );
    }
};
