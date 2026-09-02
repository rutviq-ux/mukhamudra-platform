UPDATE "MessageLog"
SET "templateId" = NULL
WHERE "templateId" IN (
  SELECT id FROM "MessageTemplate" WHERE name = 'session_reminder_email'
);

DELETE FROM "SequenceStep"
WHERE "templateId" IN (
  SELECT id FROM "MessageTemplate" WHERE name = 'session_reminder_email'
);

DELETE FROM "Broadcast"
WHERE "templateId" IN (
  SELECT id FROM "MessageTemplate" WHERE name = 'session_reminder_email'
);

DELETE FROM "MessageTemplate"
WHERE name = 'session_reminder_email';
