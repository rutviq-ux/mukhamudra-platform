UPDATE "User"
SET "phone" = NULL
WHERE "phone" IS NOT NULL
  AND (
    btrim("phone") = ''
    OR lower(btrim("phone")) IN ('null', 'undefined', 'n/a', 'na', '-')
  );
