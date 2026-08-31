UPDATE "MessageTemplate"
SET "isTransactional" = true
WHERE "channel" = 'EMAIL'
  AND "name" IN (
    'welcome',
    'payment_success',
    'booking_confirmed_email',
    'booking_cancelled_email',
    'session_cancelled_email',
    'credit_expiry_warning_email',
    'membership_activated_email',
    'session_reminder_email',
    'membership_cancelled_email',
    'payment_health_weekly_email'
  );
