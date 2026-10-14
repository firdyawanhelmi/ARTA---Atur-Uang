<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Lang;

/**
 * Password-reset mail for a mobile-API app with no web pages: the message
 * carries the single-use token for in-app entry instead of inventing a
 * link destination. Token lifecycle (hashing, 30-minute expiry, deletion
 * after use) stays entirely with the Password Broker.
 */
class ResetPasswordNotification extends BaseResetPassword
{
    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject(Lang::get('Reset your ARTA password'))
            ->line(Lang::get('Enter this code in the app to reset your password. It expires in 30 minutes and can be used only once.'))
            ->line($this->token)
            ->line(Lang::get('If you did not request this, no further action is required.'));
    }
}
