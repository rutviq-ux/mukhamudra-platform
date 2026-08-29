UPDATE "MessageTemplate"
SET
  "body" = E'{{name}},\n\nYour {{session_type}} session begins in 15 minutes.\n\nJoin from your dashboard:\n{{join_link}}\n\nGoogle Meet:\n{{meeting_link}}\n\nJoin opens 15 minutes before class.\n\nNamaste,\nMukha Mudra',
  "variables" = ARRAY['name', 'session_type', 'join_link', 'meeting_link']
WHERE "name" = 'session_reminder_email';
