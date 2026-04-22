BEGIN;

-- ============================================================
-- 1. Create BUNDLE product
-- ============================================================
INSERT INTO "Product" (id, type, name, description, "isActive", "createdAt", "updatedAt")
VALUES (
  'bundle_product_001',
  'BUNDLE',
  'Bundle',
  'Face Yoga + Pranayama combo',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (type) DO NOTHING;

-- ============================================================
-- 2. Delete old generic subscription plans (no memberships reference them)
-- ============================================================
DELETE FROM "Plan" WHERE slug IN ('monthly', 'annual');

-- ============================================================
-- 3. Create 6 product-specific subscription plans
-- ============================================================

-- Face Yoga Monthly
INSERT INTO "Plan" (id, "productId", name, slug, type, "amountPaise", "durationDays", "razorpayPlanId", description, features, "isPopular", "isActive", "interval", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'plan_face_monthly',
  (SELECT id FROM "Product" WHERE type = 'FACE_YOGA'),
  'Face Yoga Monthly',
  'face-monthly',
  'SUBSCRIPTION',
  111100, 30, NULL,
  'Monthly subscription to Face Yoga group sessions',
  ARRAY['Unlimited group sessions', '3x/week live classes (Mon/Wed/Fri)', 'Choose your batch (9 PM or 10 PM IST)', 'WhatsApp community access', 'Cancel anytime'],
  false, true, 'MONTHLY', 10, NOW(), NOW()
);

-- Face Yoga Annual
INSERT INTO "Plan" (id, "productId", name, slug, type, "amountPaise", "durationDays", "razorpayPlanId", description, features, "isPopular", "isActive", "interval", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'plan_face_annual',
  (SELECT id FROM "Product" WHERE type = 'FACE_YOGA'),
  'Face Yoga Annual',
  'face-annual',
  'SUBSCRIPTION',
  300000, 365, NULL,
  'Annual subscription to Face Yoga group sessions',
  ARRAY['Unlimited group sessions', '3x/week live classes (Mon/Wed/Fri)', 'Choose your batch (9 PM or 10 PM IST)', 'WhatsApp community access', 'Recording add-on eligible'],
  true, true, 'ANNUAL', 9, NOW(), NOW()
);

-- Pranayama Monthly
INSERT INTO "Plan" (id, "productId", name, slug, type, "amountPaise", "durationDays", "razorpayPlanId", description, features, "isPopular", "isActive", "interval", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'plan_pranayama_monthly',
  (SELECT id FROM "Product" WHERE type = 'PRANAYAMA'),
  'Pranayama Monthly',
  'pranayama-monthly',
  'SUBSCRIPTION',
  111100, 30, NULL,
  'Monthly subscription to Pranayama group sessions',
  ARRAY['Unlimited group sessions', '3x/week live classes (Mon/Wed/Fri)', 'Choose your batch (8 AM or 9 AM IST)', 'WhatsApp community access', 'Cancel anytime'],
  false, true, 'MONTHLY', 12, NOW(), NOW()
);

-- Pranayama Annual
INSERT INTO "Plan" (id, "productId", name, slug, type, "amountPaise", "durationDays", "razorpayPlanId", description, features, "isPopular", "isActive", "interval", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'plan_pranayama_annual',
  (SELECT id FROM "Product" WHERE type = 'PRANAYAMA'),
  'Pranayama Annual',
  'pranayama-annual',
  'SUBSCRIPTION',
  300000, 365, NULL,
  'Annual subscription to Pranayama group sessions',
  ARRAY['Unlimited group sessions', '3x/week live classes (Mon/Wed/Fri)', 'Choose your batch (8 AM or 9 AM IST)', 'WhatsApp community access', '8-stage progressive curriculum'],
  true, true, 'ANNUAL', 11, NOW(), NOW()
);

-- Bundle Monthly
INSERT INTO "Plan" (id, "productId", name, slug, type, "amountPaise", "durationDays", "razorpayPlanId", description, features, "isPopular", "isActive", "interval", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'plan_bundle_monthly',
  (SELECT id FROM "Product" WHERE type = 'BUNDLE'),
  'Bundle Monthly',
  'bundle-monthly',
  'SUBSCRIPTION',
  150000, 30, NULL,
  'Monthly subscription to both Face Yoga + Pranayama',
  ARRAY['All Face Yoga sessions', 'All Pranayama sessions', 'Access to all 4 batches', 'WhatsApp community for both', 'Cancel anytime'],
  false, true, 'MONTHLY', 14, NOW(), NOW()
);

-- Bundle Annual
INSERT INTO "Plan" (id, "productId", name, slug, type, "amountPaise", "durationDays", "razorpayPlanId", description, features, "isPopular", "isActive", "interval", "sortOrder", "createdAt", "updatedAt")
VALUES (
  'plan_bundle_annual',
  (SELECT id FROM "Product" WHERE type = 'BUNDLE'),
  'Bundle Annual',
  'bundle-annual',
  'SUBSCRIPTION',
  600000, 365, NULL,
  'Annual subscription to both Face Yoga + Pranayama',
  ARRAY['All Face Yoga sessions', 'All Pranayama sessions', 'Access to all 4 batches', 'WhatsApp community for both', 'Recording add-on eligible'],
  true, true, 'ANNUAL', 13, NOW(), NOW()
);

-- ============================================================
-- 4. Delete old batches and create proper ones
-- ============================================================
DELETE FROM "Batch" WHERE slug IN ('as', 'morning', 'evening');

-- Face Yoga evening batches
INSERT INTO "Batch" (id, "productId", name, slug, description, "daysOfWeek", "startTime", "durationMin", timezone, capacity, "isActive", "createdAt", "updatedAt")
VALUES
(
  'batch_face_9pm',
  (SELECT id FROM "Product" WHERE type = 'FACE_YOGA'),
  '9 PM Batch',
  'face-evening-9pm',
  'Wind down your evening with facial toning and relaxation.',
  ARRAY[1, 3, 5], '21:00', 30, 'Asia/Kolkata', 50, true, NOW(), NOW()
),
(
  'batch_face_10pm',
  (SELECT id FROM "Product" WHERE type = 'FACE_YOGA'),
  '10 PM Batch',
  'face-evening-10pm',
  'Late evening session before bed — perfect for night owls.',
  ARRAY[1, 3, 5], '22:00', 30, 'Asia/Kolkata', 50, true, NOW(), NOW()
);

-- Pranayama morning batches
INSERT INTO "Batch" (id, "productId", name, slug, description, "daysOfWeek", "startTime", "durationMin", timezone, capacity, "isActive", "createdAt", "updatedAt")
VALUES
(
  'batch_pranayama_8am',
  (SELECT id FROM "Product" WHERE type = 'PRANAYAMA'),
  '8 AM Batch',
  'pranayama-morning-8am',
  'Start your day with breathwork — energy and clarity before the world wakes up.',
  ARRAY[1, 3, 5], '08:00', 30, 'Asia/Kolkata', 50, true, NOW(), NOW()
),
(
  'batch_pranayama_9am',
  (SELECT id FROM "Product" WHERE type = 'PRANAYAMA'),
  '9 AM Batch',
  'pranayama-morning-9am',
  'Mid-morning session — perfect after your workout or morning routine.',
  ARRAY[1, 3, 5], '09:00', 30, 'Asia/Kolkata', 50, true, NOW(), NOW()
);

COMMIT;
