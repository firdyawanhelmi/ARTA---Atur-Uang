<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Auth\DeviceController;
use App\Http\Controllers\Api\V1\Auth\VerifyEmailController;
use App\Http\Controllers\Api\V1\MeController;
use App\Http\Controllers\Api\V1\VerifyPendingEmailController;
use App\Http\Middleware\ValidateDeviceSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware(['auth:sanctum', ValidateDeviceSession::class]);

Route::prefix('v1')->group(function () {
    Route::get('/me', MeController::class)
        ->middleware(['auth:sanctum', ValidateDeviceSession::class]);
    Route::patch('/me', [MeController::class, 'update'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class]);
    Route::patch('/me/password', [MeController::class, 'changePassword'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class, 'throttle:change-password-account', 'throttle:change-password-ip']);
    Route::patch('/me/email', [MeController::class, 'changeEmail'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class, 'throttle:change-email-account', 'throttle:change-email-ip']);
    Route::get('/me/email/verify/{id}/{hash}', VerifyPendingEmailController::class)
        ->middleware(['signed', 'throttle:verify-pending-email'])
        ->whereUuid('id')
        ->name('profile.email.verify');
    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:login');
    Route::post('/auth/register', [AuthController::class, 'register'])
        ->middleware('throttle:register');
    Route::post('/auth/resend-verification', [AuthController::class, 'resendVerification'])
        ->middleware(['throttle:resend-verification-ip', 'throttle:resend-verification-account']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword'])
        ->middleware(['throttle:forgot-password-ip', 'throttle:forgot-password-account']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword'])
        ->middleware(['throttle:reset-password-ip', 'throttle:reset-password-account']);
    Route::post('/auth/logout', [AuthController::class, 'logout'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class]);
    Route::post('/auth/logout-all', [AuthController::class, 'logoutAll'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class]);
    Route::get('/auth/verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:verify-email'])
        ->whereUuid('id')
        ->name('verification.verify');
    Route::get('/auth/devices', [DeviceController::class, 'index'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class]);
    Route::patch('/auth/devices/{device}', [DeviceController::class, 'update'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class]);
    Route::delete('/auth/devices/{device}/session', [DeviceController::class, 'revoke'])
        ->middleware(['auth:sanctum', ValidateDeviceSession::class]);
});
