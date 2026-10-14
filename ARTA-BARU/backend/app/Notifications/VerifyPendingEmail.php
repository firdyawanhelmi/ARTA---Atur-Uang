<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Lang;

/**
 * Carries a pre-signed verification URL for a pending email address.
 * The URL itself is built by the controller (bound to user id + pending
 * address hash, 60-minute expiry); this notification only renders it.
 * No deep-link scheme is invented: the mail links back to the API.
 */
class VerifyPendingEmail extends Notification
{
    use Queueable;

    public function __construct(public readonly string $url) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject(Lang::get('Verify your new ARTA email address'))
            ->line(Lang::get('Click below to confirm this address. The link expires in 60 minutes and stops working once replaced or used.'))
            ->action(Lang::get('Verify Email Address'), $this->url)
            ->line(Lang::get('If you did not request this, no further action is required.'));
    }
}
