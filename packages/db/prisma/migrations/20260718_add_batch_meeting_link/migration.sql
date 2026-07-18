-- AlterTable
ALTER TABLE "Batch" ADD COLUMN "meetingLink" TEXT;
ALTER TABLE "Batch" ADD COLUMN "meetingId" TEXT;

-- Set the permanent Meet links for each active batch's time slot, and
-- extract the Meet conference ID (the abc-defg-hij portion of the URL).
UPDATE "Batch" SET
  "meetingLink" = 'https://meet.google.com/yab-zhcn-rke',
  "meetingId" = 'yab-zhcn-rke'
WHERE "slug" = 'pranayama-morning-8am';

UPDATE "Batch" SET
  "meetingLink" = 'https://meet.google.com/cnx-xhnq-byc',
  "meetingId" = 'cnx-xhnq-byc'
WHERE "slug" = 'pranayama-morning-9am';

UPDATE "Batch" SET
  "meetingLink" = 'https://meet.google.com/ekv-cqwe-awx',
  "meetingId" = 'ekv-cqwe-awx'
WHERE "slug" = 'face-evening-9pm';

UPDATE "Batch" SET
  "meetingLink" = 'https://meet.google.com/hrf-gcxz-buh',
  "meetingId" = 'hrf-gcxz-buh'
WHERE "slug" = 'face-evening-10pm';
