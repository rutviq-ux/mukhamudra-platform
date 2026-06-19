-- AlterTable
ALTER TABLE "MessageTemplate" ADD COLUMN "isTransactional" BOOLEAN NOT NULL DEFAULT false;

-- Data migration: mark known transactional (service) email templates so they
-- bypass the marketing opt-in gate. These are messages users need regardless
-- of marketing consent (payment confirmations, membership activation, booking
-- confirmations, etc.), not promotional content.
UPDATE "MessageTemplate"
SET "isTransactional" = true
WHERE "name" IN (
  'payment_success',
  'booking_confirmed_email',
  'booking_cancelled_email',
  'session_cancelled_email',
  'credit_expiry_warning_email',
  'membership_activated_email',
  'membership_cancelled_email'
);
