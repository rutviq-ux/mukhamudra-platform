/**
 * Database Seed Script
 * Seeds products, plans, batches, and a default admin user
 */

import { prisma } from "@ru/db";

async function main() {
  console.log("🌱 Seeding database...\n");

  // Create Products
  console.log("Creating products...");
  const faceYoga = await prisma.product.upsert({
    where: { type: "FACE_YOGA" },
    update: {},
    create: {
      type: "FACE_YOGA",
      name: "Face Yoga",
      description: "Personalized one-on-one Face Yoga sessions",
      isActive: true,
    },
  });

  const pranayama = await prisma.product.upsert({
    where: { type: "PRANAYAMA" },
    update: {},
    create: {
      type: "PRANAYAMA",
      name: "Pranayama",
      description: "Daily group breathing sessions",
      isActive: true,
    },
  });

  const bundle = await prisma.product.upsert({
    where: { type: "BUNDLE" },
    update: {},
    create: {
      type: "BUNDLE",
      name: "Face Yoga + Pranayama Bundle",
      description: "Complete wellness — Face Yoga and Pranayama together",
      isActive: true,
    },
  });
  console.log("✅ Products created (Face Yoga + Pranayama + Bundle)\n");

  // ═══════════════════════════════════════════════════
  // Deactivate Legacy Plans
  // ═══════════════════════════════════════════════════
  console.log("Deactivating legacy plans...");
  await prisma.plan.updateMany({
    where: { slug: { in: ["single", "pack-4", "pack-12", "monthly", "annual"] } },
    data: { isActive: false },
  });
  console.log("✅ Legacy plans deactivated\n");

  // ═══════════════════════════════════════════════════
  // New Subscription Plans (6 plans + 1 add-on)
  // ═══════════════════════════════════════════════════
  console.log("Creating new subscription plans...");

  // Face Yoga — Annual ₹3,000/yr
  await prisma.plan.upsert({
    where: { slug: "face-annual" },
    update: { amountPaise: 300000, isActive: true },
    create: {
      productId: faceYoga.id,
      name: "Face Yoga Annual",
      slug: "face-annual",
      type: "SUBSCRIPTION",
      interval: "ANNUAL",
      amountPaise: 300000, // ₹3,000/yr

      durationDays: 365,
      description: "One full year of group Face Yoga sessions",
      features: [
        "Unlimited group sessions",
        "3x/week live classes (Mon/Wed/Fri)",
        "Choose your batch (9 PM or 10 PM IST)",
        "WhatsApp community access",
        "Recording add-on eligible",
      ],
      isPopular: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  // Face Yoga — Monthly ₹1,111/mo
  await prisma.plan.upsert({
    where: { slug: "face-monthly" },
    update: { amountPaise: 111100, isActive: true },
    create: {
      productId: faceYoga.id,
      name: "Face Yoga Monthly",
      slug: "face-monthly",
      type: "SUBSCRIPTION",
      interval: "MONTHLY",
      amountPaise: 111100, // ₹1,111/mo

      durationDays: 30,
      description: "Monthly access to group Face Yoga sessions",
      features: [
        "Unlimited group sessions",
        "3x/week live classes (Mon/Wed/Fri)",
        "Choose your batch (9 PM or 10 PM IST)",
        "WhatsApp community access",
        "Cancel anytime",
      ],
      isActive: true,
      sortOrder: 2,
    },
  });

  // Pranayama — Annual ₹3,000/yr
  await prisma.plan.upsert({
    where: { slug: "pranayama-annual" },
    update: { amountPaise: 300000, isActive: true },
    create: {
      productId: pranayama.id,
      name: "Pranayama Annual",
      slug: "pranayama-annual",
      type: "SUBSCRIPTION",
      interval: "ANNUAL",
      amountPaise: 300000, // ₹3,000/yr

      durationDays: 365,
      description: "One full year of group Pranayama sessions",
      features: [
        "Unlimited group sessions",
        "3x/week live classes (Mon/Wed/Fri)",
        "Choose your batch (8 AM or 9 AM IST)",
        "8-stage ascending curriculum",
        "WhatsApp community access",
        "Recording add-on eligible",
      ],
      isActive: true,
      sortOrder: 1,
    },
  });

  // Pranayama — Monthly ₹1,111/mo
  await prisma.plan.upsert({
    where: { slug: "pranayama-monthly" },
    update: { amountPaise: 111100, isActive: true },
    create: {
      productId: pranayama.id,
      name: "Pranayama Monthly",
      slug: "pranayama-monthly",
      type: "SUBSCRIPTION",
      interval: "MONTHLY",
      amountPaise: 111100, // ₹1,111/mo

      durationDays: 30,
      description: "Monthly access to group Pranayama sessions",
      features: [
        "Unlimited group sessions",
        "3x/week live classes (Mon/Wed/Fri)",
        "Choose your batch (8 AM or 9 AM IST)",
        "8-stage ascending curriculum",
        "WhatsApp community access",
        "Cancel anytime",
      ],
      isActive: true,
      sortOrder: 2,
    },
  });

  // Bundle — Annual ₹6,000/yr
  await prisma.plan.upsert({
    where: { slug: "bundle-annual" },
    update: { amountPaise: 600000, isActive: true },
    create: {
      productId: bundle.id,
      name: "Face Yoga + Pranayama Annual",
      slug: "bundle-annual",
      type: "SUBSCRIPTION",
      interval: "ANNUAL",
      amountPaise: 600000, // ₹6,000/yr

      durationDays: 365,
      description: "One full year of both Face Yoga and Pranayama",
      features: [
        "Access to ALL 4 batches",
        "6x/week live classes (Mon/Wed/Fri)",
        "Face Yoga + Pranayama combined",
        "WhatsApp community access",
        "Recording add-on eligible",
        "Complete wellness package",
      ],
      isPopular: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  // Bundle — Monthly ₹1,500/mo
  await prisma.plan.upsert({
    where: { slug: "bundle-monthly" },
    update: { amountPaise: 150000, isActive: true },
    create: {
      productId: bundle.id,
      name: "Face Yoga + Pranayama Monthly",
      slug: "bundle-monthly",
      type: "SUBSCRIPTION",
      interval: "MONTHLY",
      amountPaise: 150000, // ₹1,500/mo

      durationDays: 30,
      description: "Monthly access to both Face Yoga and Pranayama",
      features: [
        "Access to ALL 4 batches",
        "6x/week live classes (Mon/Wed/Fri)",
        "Face Yoga + Pranayama combined",
        "WhatsApp community access",
        "Cancel anytime",
      ],
      isActive: true,
      sortOrder: 2,
    },
  });

  // Recording Add-on — ₹1,000/yr (ONE_TIME, annual plan holders only)
  await prisma.plan.upsert({
    where: { slug: "recording-addon" },
    update: { amountPaise: 100000, isActive: true },
    create: {
      productId: faceYoga.id, // Linked to Face Yoga but grants access to ALL recordings
      name: "Recording Access",
      slug: "recording-addon",
      type: "ONE_TIME",
      interval: "ANNUAL",
      amountPaise: 100000, // ₹1,000/yr

      durationDays: 365,
      description: "Access all session recordings for one year",
      features: [
        "Access ALL session recordings",
        "Face Yoga + Pranayama recordings",
        "Watch anytime, anywhere",
        "Available for annual plan holders only",
      ],
      isActive: true,
      sortOrder: 10,
    },
  });
  console.log("✅ New plans created (6 subscriptions + 1 recording add-on)\n");

  // ═══════════════════════════════════════════════════
  // Deactivate Legacy Batches & Create New Ones
  // ═══════════════════════════════════════════════════
  console.log("Deactivating legacy batches...");
  await prisma.batch.updateMany({
    where: { slug: { in: ["morning", "evening"] } },
    data: { isActive: false },
  });
  console.log("✅ Legacy batches deactivated\n");

  console.log("Creating new batches (4 total)...");

  // Face Yoga — Evening 9 PM IST (Mon/Wed/Fri)
  await prisma.batch.upsert({
    where: { slug: "face-evening-9pm" },
    update: { isActive: true },
    create: {
      productId: faceYoga.id,
      name: "Face Yoga — 9 PM",
      slug: "face-evening-9pm",
      description: "Evening Face Yoga group session at 9 PM IST",
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      startTime: "21:00",
      durationMin: 30,
      timezone: "Asia/Kolkata",
      capacity: 50,
      isActive: true,
    },
  });

  // Face Yoga — Evening 10 PM IST (Mon/Wed/Fri)
  await prisma.batch.upsert({
    where: { slug: "face-evening-10pm" },
    update: { isActive: true },
    create: {
      productId: faceYoga.id,
      name: "Face Yoga — 10 PM",
      slug: "face-evening-10pm",
      description: "Evening Face Yoga group session at 10 PM IST",
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      startTime: "22:00",
      durationMin: 30,
      timezone: "Asia/Kolkata",
      capacity: 50,
      isActive: true,
    },
  });

  // Pranayama — Morning 8 AM IST (Mon/Wed/Fri)
  await prisma.batch.upsert({
    where: { slug: "pranayama-morning-8am" },
    update: { isActive: true },
    create: {
      productId: pranayama.id,
      name: "Pranayama — 8 AM",
      slug: "pranayama-morning-8am",
      description: "Morning Pranayama group session at 8 AM IST",
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      startTime: "08:00",
      durationMin: 30,
      timezone: "Asia/Kolkata",
      capacity: 50,
      isActive: true,
    },
  });

  // Pranayama — Morning 9 AM IST (Mon/Wed/Fri)
  await prisma.batch.upsert({
    where: { slug: "pranayama-morning-9am" },
    update: { isActive: true },
    create: {
      productId: pranayama.id,
      name: "Pranayama — 9 AM",
      slug: "pranayama-morning-9am",
      description: "Morning Pranayama group session at 9 AM IST",
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      startTime: "09:00",
      durationMin: 30,
      timezone: "Asia/Kolkata",
      capacity: 50,
      isActive: true,
    },
  });
  console.log("✅ New batches created (2 Face Yoga + 2 Pranayama)\n");

  // Create Default & Demo Users
  console.log("Creating users...");
  await prisma.user.upsert({
    where: { email: "admin@mukhamudra.com" },
    update: { role: "ADMIN" },
    create: {
      email: "admin@mukhamudra.com",
      name: "Admin",
      role: "ADMIN",
      timezone: "Asia/Kolkata",
      marketingOptIn: true,
      whatsappOptIn: true,
    },
  });

  // RU (Robin) - Primary admin user
  await prisma.user.upsert({
    where: { email: "robin@mukhamudra.com" },
    update: { role: "ADMIN" },
    create: {
      email: "robin@mukhamudra.com",
      name: "RU",
      role: "ADMIN",
      timezone: "Asia/Kolkata",
      marketingOptIn: true,
      whatsappOptIn: true,
    },
  });

  // Demo users for Rutviq
  await prisma.user.upsert({
    where: { email: "demo-admin@mukhamudra.com" },
    update: { role: "ADMIN" },
    create: {
      email: "demo-admin@mukhamudra.com",
      name: "Demo Admin",
      role: "ADMIN",
      timezone: "Asia/Kolkata",
      marketingOptIn: true,
      whatsappOptIn: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "demo-coach@mukhamudra.com" },
    update: { role: "COACH" },
    create: {
      email: "demo-coach@mukhamudra.com",
      name: "Demo Coach",
      role: "COACH",
      timezone: "Asia/Kolkata",
      marketingOptIn: true,
      whatsappOptIn: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "demo-member@mukhamudra.com" },
    update: { role: "USER" },
    create: {
      email: "demo-member@mukhamudra.com",
      name: "Demo Member",
      role: "USER",
      timezone: "Asia/Kolkata",
      marketingOptIn: true,
      whatsappOptIn: true,
    },
  });
  console.log("✅ Users created (2 admin + 3 demo)\n");

  // Create Message Templates
  console.log("Creating message templates...");

  // ═══════════════════════════════════════════════════
  // WhatsApp Templates — 12 Categories, 48 Templates
  // Brand: Mukha Mudra (मुख मुद्रा)
  // ═══════════════════════════════════════════════════

  // ── 1. Onboarding (4) ──────────────────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "welcome_message" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "welcome_message",
      body: "Namaste {{name}}, welcome to Mukha Mudra — मुख मुद्रा.\n\nWe are delighted to have you join our practice. Whether you are here for Face Yoga or Pranayama, every session is a step toward radiance.\n\nExplore your dashboard to book your first session: {{dashboard_link}}\n\nWith warmth,\nMukha Mudra",
      variables: ["name", "dashboard_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "first_session_guide" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "first_session_guide",
      body: "{{name}}, your first session is approaching.\n\nA few things to prepare:\n• Find a quiet, well-lit space\n• Keep a mirror nearby for Face Yoga\n• Join 2–3 minutes early to settle in\n• Have water within reach\n\nYour instructor will guide you through everything. No prior experience needed.\n\nSee you on the mat.",
      variables: ["name"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "tools_and_resources" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "tools_and_resources",
      body: "{{name}}, here are the essentials for your practice:\n\n• Dashboard — Book & manage sessions: {{dashboard_link}}\n• Schedule — View upcoming sessions: {{schedule_link}}\n• Face Yoga — Mirror + good lighting\n• Pranayama — Comfortable seated position\n\nBookmark these for quick access. Reach out anytime if you need guidance.",
      variables: ["name", "dashboard_link", "schedule_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "introduction_to_instructor" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "introduction_to_instructor",
      body: "{{name}}, meet your instructor — {{instructor_name}}.\n\n{{instructor_bio}}\n\n{{instructor_name}} will be guiding your {{session_type}} sessions. Feel free to share any goals or concerns before your first session.\n\nWe believe the best practice begins with trust.",
      variables: ["name", "instructor_name", "instructor_bio", "session_type"],
      isActive: true,
    },
  });

  // ── 2. Session Management (5) ──────────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "session_reminder" },
    update: {
      body: "{{name}}, your {{session_type}} session begins in 15 minutes.\n\nJoin here: {{join_link}}\n\nTake a moment to settle in. We will see you shortly.\n\n— Mukha Mudra",
      variables: ["name", "session_type", "join_link"],
    },
    create: {
      channel: "WHATSAPP",
      name: "session_reminder",
      body: "{{name}}, your {{session_type}} session begins in 15 minutes.\n\nJoin here: {{join_link}}\n\nTake a moment to settle in. We will see you shortly.\n\n— Mukha Mudra",
      variables: ["name", "session_type", "join_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "session_reminder_1hr" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "session_reminder_1hr",
      body: "{{name}}, a gentle reminder — your {{session_type}} session is in 1 hour.\n\nDate: {{date}}\nTime: {{time}}\n\nThe join link will arrive 15 minutes before. Take this time to prepare your space.\n\n— Mukha Mudra",
      variables: ["name", "session_type", "date", "time"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "session_link_delivery" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "session_link_delivery",
      body: "{{name}}, your {{session_type}} session is ready.\n\nJoin now: {{join_link}}\n\nYour instructor is waiting. Namaste.",
      variables: ["name", "session_type", "join_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "session_cancelled_notice" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "session_cancelled_notice",
      body: "{{name}}, we regret to inform you that your {{session_type}} session on {{date}} at {{time}} has been cancelled.\n\n{{reason}}\n\nYour credit has been refunded automatically. You may rebook at your convenience from the dashboard.\n\nWe apologise for the inconvenience.\n\n— Mukha Mudra",
      variables: ["name", "session_type", "date", "time", "reason"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "booking_confirmed_wa" },
    update: {
      body: "{{name}}, your {{session_type}} session is confirmed.\n\nDate: {{date}}\nTime: {{time}}\n\nYou will receive the join link before the session begins. We look forward to practising with you.\n\n— Mukha Mudra",
      variables: ["name", "session_type", "date", "time"],
    },
    create: {
      channel: "WHATSAPP",
      name: "booking_confirmed_wa",
      body: "{{name}}, your {{session_type}} session is confirmed.\n\nDate: {{date}}\nTime: {{time}}\n\nYou will receive the join link before the session begins. We look forward to practising with you.\n\n— Mukha Mudra",
      variables: ["name", "session_type", "date", "time"],
      isActive: true,
    },
  });

  // ── 3. Payments & Subscriptions (4) ────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "payment_success_wa" },
    update: {
      body: "{{name}}, your payment of ₹{{amount}} for {{plan_name}} has been received.\n\nOrder: #{{order_id}}\n\nYou may now book your sessions from the dashboard. Thank you for choosing Mukha Mudra.\n\n— Mukha Mudra",
      variables: ["name", "amount", "plan_name", "order_id"],
    },
    create: {
      channel: "WHATSAPP",
      name: "payment_success_wa",
      body: "{{name}}, your payment of ₹{{amount}} for {{plan_name}} has been received.\n\nOrder: #{{order_id}}\n\nYou may now book your sessions from the dashboard. Thank you for choosing Mukha Mudra.\n\n— Mukha Mudra",
      variables: ["name", "amount", "plan_name", "order_id"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "payment_failed_alert" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "payment_failed_alert",
      body: "{{name}}, your payment of ₹{{amount}} for {{plan_name}} could not be processed.\n\nOrder: #{{order_id}}\nReason: {{reason}}\n\nPlease try again or use a different payment method. If the issue persists, reach out to us and we will assist you.\n\n— Mukha Mudra",
      variables: ["name", "amount", "plan_name", "order_id", "reason"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "subscription_activated" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "subscription_activated",
      body: "{{name}}, your {{plan_name}} subscription is now active.\n\nValid until: {{end_date}}\n\nYou have access to all scheduled sessions under your plan. Visit your dashboard to begin booking.\n\nWelcome to the practice.\n\n— Mukha Mudra",
      variables: ["name", "plan_name", "end_date"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "subscription_expiring_soon" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "subscription_expiring_soon",
      body: "{{name}}, your {{plan_name}} subscription expires on {{end_date}}.\n\nRenew to continue your practice without interruption. Consistency is the foundation of transformation.\n\nRenew here: {{renewal_link}}\n\n— Mukha Mudra",
      variables: ["name", "plan_name", "end_date", "renewal_link"],
      isActive: true,
    },
  });

  // ── 4. Program Information (4) ─────────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "face_yoga_program_details" },
    update: {
      body: "{{name}}, here is what Face Yoga at Mukha Mudra offers:\n\n• Live group sessions 3x/week (Mon/Wed/Fri)\n• 7 techniques: Face Yoga, Gua Sha, Roller, Trataka, Osteopathy, Cupping, Acupressure\n• Evening batches — 9 PM or 10 PM IST\n• Annual ₹3,000/yr or Monthly ₹1,111/mo\n• Recording add-on available for annual plans\n\nEvery face tells a story. Let yours reflect vitality.\n\nLearn more: {{link}}\n\n— Mukha Mudra",
    },
    create: {
      channel: "WHATSAPP",
      name: "face_yoga_program_details",
      body: "{{name}}, here is what Face Yoga at Mukha Mudra offers:\n\n• Live group sessions 3x/week (Mon/Wed/Fri)\n• 7 techniques: Face Yoga, Gua Sha, Roller, Trataka, Osteopathy, Cupping, Acupressure\n• Evening batches — 9 PM or 10 PM IST\n• Annual ₹3,000/yr or Monthly ₹1,111/mo\n• Recording add-on available for annual plans\n\nEvery face tells a story. Let yours reflect vitality.\n\nLearn more: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "pranayama_program_details" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "pranayama_program_details",
      body: "{{name}}, discover Pranayama at Mukha Mudra:\n\n• Daily group breathing sessions\n• Guided techniques for calm, focus & energy\n• Suitable for all levels — beginners welcome\n• Join from anywhere, on any device\n\nBreath is the bridge between body and mind.\n\nLearn more: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "combo_package_info" },
    update: {
      body: "{{name}}, our Bundle brings together the best of both worlds:\n\n• Face Yoga + Pranayama group sessions\n• Access to all 4 batches (morning + evening)\n• Annual ₹6,000/yr or Monthly ₹1,500/mo\n• Save compared to individual plans\n\nA complete practice for face, breath, and well-being.\n\nDetails: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "link"],
    },
    create: {
      channel: "WHATSAPP",
      name: "combo_package_info",
      body: "{{name}}, our Bundle brings together the best of both worlds:\n\n• Face Yoga + Pranayama group sessions\n• Access to all 4 batches (morning + evening)\n• Annual ₹6,000/yr or Monthly ₹1,500/mo\n• Save compared to individual plans\n\nA complete practice for face, breath, and well-being.\n\nDetails: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "pricing_comparison" },
    update: {
      body: "{{name}}, here is an overview of our plans:\n\n• Face Yoga: ₹3,000/yr or ₹1,111/mo\n• Pranayama: ₹3,000/yr or ₹1,111/mo\n• Bundle (both): ₹6,000/yr or ₹1,500/mo\n• Recording Add-on: ₹1,000/yr (annual plans only)\n\nAll plans include live group sessions 3x/week, WhatsApp community, and progress tracking.\n\nChoose your plan: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "link"],
    },
    create: {
      channel: "WHATSAPP",
      name: "pricing_comparison",
      body: "{{name}}, here is an overview of our plans:\n\n• Face Yoga: ₹3,000/yr or ₹1,111/mo\n• Pranayama: ₹3,000/yr or ₹1,111/mo\n• Bundle (both): ₹6,000/yr or ₹1,500/mo\n• Recording Add-on: ₹1,000/yr (annual plans only)\n\nAll plans include live group sessions 3x/week, WhatsApp community, and progress tracking.\n\nChoose your plan: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "link"],
      isActive: true,
    },
  });

  // ── 5. Engagement & Retention (4) ──────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "weekly_progress_checkin" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "weekly_progress_checkin",
      body: "{{name}}, here is your week in review:\n\n• Sessions attended: {{sessions_count}}\n• Current streak: {{streak}} days\n\n{{encouragement}}\n\nKeep showing up — the practice rewards consistency.\n\n— Mukha Mudra",
      variables: ["name", "sessions_count", "streak", "encouragement"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "monthly_achievement_report" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "monthly_achievement_report",
      body: "{{name}}, your {{month}} at a glance:\n\n• Total sessions: {{total_sessions}}\n• Longest streak: {{longest_streak}} days\n• {{highlight}}\n\nEvery session is a quiet act of self-care. Well done.\n\n— Mukha Mudra",
      variables: ["name", "month", "total_sessions", "longest_streak", "highlight"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "testimonial_request" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "testimonial_request",
      body: "{{name}}, you have completed {{sessions_count}} sessions with us — that is wonderful.\n\nWould you be willing to share a few words about your experience? Your story could inspire someone to begin their own practice.\n\nShare here: {{testimonial_link}}\n\nThank you for being part of Mukha Mudra.",
      variables: ["name", "sessions_count", "testimonial_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "referral_rewards" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "referral_rewards",
      body: "{{name}}, share the practice with someone you care about.\n\nRefer a friend to Mukha Mudra and you both receive {{reward}}.\n\nYour referral code: {{referral_code}}\nShare link: {{referral_link}}\n\nGood things grow when shared.\n\n— Mukha Mudra",
      variables: ["name", "reward", "referral_code", "referral_link"],
      isActive: true,
    },
  });

  // ── 6. Support & FAQ (4) ───────────────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "common_questions_auto_reply" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "common_questions_auto_reply",
      body: "Thank you for reaching out to Mukha Mudra.\n\nHere are answers to common questions:\n\n• How to book: Visit your dashboard → Book\n• How to reschedule: Cancel and rebook from your dashboard\n• Session timing: Check the Schedule page\n• Payment issues: Contact us at {{support_email}}\n\nFor anything else, reply here and we will get back to you.",
      variables: ["support_email"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "technical_troubleshooting" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "technical_troubleshooting",
      body: "{{name}}, sorry to hear you are facing a technical issue.\n\nA few things to try:\n• Refresh the page or restart the app\n• Check your internet connection\n• Try a different browser (Chrome recommended)\n• Clear your browser cache\n\nIf the issue continues, reply with a screenshot and we will help resolve it promptly.\n\n— Mukha Mudra",
      variables: ["name"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "schedule_change_process" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "schedule_change_process",
      body: "{{name}}, to reschedule your session:\n\n1. Go to your Dashboard → Schedule\n2. Cancel the existing booking\n3. Book a new slot that suits you\n\nCancellations made 2+ hours before the session will refund your credit automatically.\n\nNeed help? Reply here.\n\n— Mukha Mudra",
      variables: ["name"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "contact_support" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "contact_support",
      body: "{{name}}, we are here to help.\n\n• WhatsApp: Reply to this message\n• Email: {{support_email}}\n• Dashboard: {{dashboard_link}}\n\nOur team typically responds within a few hours during business hours.\n\n— Mukha Mudra",
      variables: ["name", "support_email", "dashboard_link"],
      isActive: true,
    },
  });

  // ── 7. Promotional (4) ─────────────────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "new_program_announcement" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "new_program_announcement",
      body: "{{name}}, something new at Mukha Mudra.\n\n{{program_name}} — {{program_description}}\n\nStarting: {{start_date}}\n\nBe among the first to experience it: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "program_name", "program_description", "start_date", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "limited_time_offer" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "limited_time_offer",
      body: "{{name}}, a limited offering for you.\n\n{{offer_details}}\n\nValid until: {{expiry_date}}\n\nUse code: {{coupon_code}}\nClaim here: {{link}}\n\nThis is our way of honouring your commitment to the practice.\n\n— Mukha Mudra",
      variables: ["name", "offer_details", "expiry_date", "coupon_code", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "holiday_schedule_notice" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "holiday_schedule_notice",
      body: "{{name}}, a note on our schedule.\n\n{{holiday_name}}: {{holiday_details}}\n\nRegular sessions resume on {{resume_date}}.\n\nWishing you a peaceful {{holiday_name}}.\n\n— Mukha Mudra",
      variables: ["name", "holiday_name", "holiday_details", "resume_date"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "early_bird_discount" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "early_bird_discount",
      body: "{{name}}, early risers get rewarded.\n\n{{offer_details}}\n\nAvailable to the first {{spots}} members only.\nUse code: {{coupon_code}}\n\nClaim here: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "offer_details", "spots", "coupon_code", "link"],
      isActive: true,
    },
  });

  // ── 8. Administrative (4) ──────────────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "terms_and_conditions" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "terms_and_conditions",
      body: "{{name}}, as requested — here are our Terms & Conditions:\n\n{{terms_link}}\n\nPlease review them at your convenience. If you have any questions, we are happy to clarify.\n\n— Mukha Mudra",
      variables: ["name", "terms_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "privacy_policy" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "privacy_policy",
      body: "{{name}}, your privacy matters to us.\n\nRead our Privacy Policy: {{privacy_link}}\n\nWe handle your data with care and transparency. Reach out if you have any concerns.\n\n— Mukha Mudra",
      variables: ["name", "privacy_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "optout_confirmation" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "optout_confirmation",
      body: "{{name}}, you have been unsubscribed from Mukha Mudra WhatsApp messages.\n\nYou will no longer receive messages from us on this channel. You can re-subscribe anytime from your dashboard settings.\n\nWe respect your choice. Namaste.\n\n— Mukha Mudra",
      variables: ["name"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "data_update_request" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "data_update_request",
      body: "{{name}}, we would like to keep your information current.\n\nPlease verify or update your details:\n• Name, phone, email\n• Preferred session times\n• Any health considerations\n\nUpdate here: {{settings_link}}\n\nThis helps us serve you better.\n\n— Mukha Mudra",
      variables: ["name", "settings_link"],
      isActive: true,
    },
  });

  // ── 9. Post-Session Follow-up (4) ──────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "session_feedback_request" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "session_feedback_request",
      body: "{{name}}, thank you for today's {{session_type}} session.\n\nHow was your experience? Your feedback helps us refine the practice for you.\n\nShare here: {{feedback_link}}\n\nEvery voice shapes Mukha Mudra.\n\n— Mukha Mudra",
      variables: ["name", "session_type", "feedback_link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "practice_tips" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "practice_tips",
      body: "{{name}}, a tip to carry forward from today's session:\n\n{{tip}}\n\nSmall, consistent efforts create lasting change. See you at the next session.\n\n— Mukha Mudra",
      variables: ["name", "tip"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "next_session_preview" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "next_session_preview",
      body: "{{name}}, your next session is on {{date}} at {{time}}.\n\n{{session_type}}: {{session_preview}}\n\nWe will send you the join link beforehand. Until then, keep practising.\n\n— Mukha Mudra",
      variables: ["name", "date", "time", "session_type", "session_preview"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "homework_reminder" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "homework_reminder",
      body: "{{name}}, a gentle nudge for your daily practice.\n\nFrom your last session:\n{{homework}}\n\nEven 5 minutes a day makes a difference. Your next session is on {{next_date}} — come prepared to build on your progress.\n\n— Mukha Mudra",
      variables: ["name", "homework", "next_date"],
      isActive: true,
    },
  });

  // ── 10. Milestone Celebrations (4) ─────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "session_milestone" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "session_milestone",
      body: "{{name}}, you have completed {{milestone_count}} sessions with Mukha Mudra.\n\nThat is {{milestone_count}} times you chose yourself. {{milestone_message}}\n\nHere is to the next milestone.\n\n— Mukha Mudra",
      variables: ["name", "milestone_count", "milestone_message"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "birthday_wishes" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "birthday_wishes",
      body: "{{name}}, wishing you a beautiful birthday.\n\nMay this year bring you radiance, calm, and the strength of a steady practice.\n\nAs a small gift from us: {{birthday_offer}}\n\nCelebrate well. Namaste.\n\n— Mukha Mudra",
      variables: ["name", "birthday_offer"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "anniversary_message" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "anniversary_message",
      body: "{{name}}, it has been {{duration}} since you joined Mukha Mudra.\n\n{{anniversary_message}}\n\nThank you for trusting us with your practice. Here is to many more sessions together.\n\n— Mukha Mudra",
      variables: ["name", "duration", "anniversary_message"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "achievement_unlocked" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "achievement_unlocked",
      body: "{{name}}, achievement unlocked: {{achievement_name}}\n\n{{achievement_description}}\n\nYour dedication speaks louder than words. Keep going.\n\n— Mukha Mudra",
      variables: ["name", "achievement_name", "achievement_description"],
      isActive: true,
    },
  });

  // ── 11. Community Building (4) ─────────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "group_challenge_invitation" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "group_challenge_invitation",
      body: "{{name}}, join our {{challenge_name}}.\n\n{{challenge_details}}\n\nDuration: {{duration}}\nStarts: {{start_date}}\n\nPractise alongside fellow members and grow together: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "challenge_name", "challenge_details", "duration", "start_date", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "success_story_share" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "success_story_share",
      body: "{{name}}, inspiration from our community:\n\n\"{{story_excerpt}}\"\n— {{story_author}}\n\nEvery practice has a story. Yours is being written with each session.\n\nRead more: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "story_excerpt", "story_author", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "live_qa_announcement" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "live_qa_announcement",
      body: "{{name}}, join us for a live Q&A session.\n\nTopic: {{topic}}\nWith: {{host_name}}\nDate: {{date}}\nTime: {{time}}\n\nBring your questions — no question is too small.\n\nJoin here: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "topic", "host_name", "date", "time", "link"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "community_guidelines" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "community_guidelines",
      body: "{{name}}, welcome to the Mukha Mudra community.\n\nOur shared values:\n• Respect every practitioner's journey\n• Be present and punctual in sessions\n• Keep conversations supportive and kind\n• Honour the privacy of fellow members\n\nTogether, we create a space for growth.\n\nFull guidelines: {{link}}\n\n— Mukha Mudra",
      variables: ["name", "link"],
      isActive: true,
    },
  });

  // ── 12. Health & Wellness Tips (4) ─────────────────
  await prisma.messageTemplate.upsert({
    where: { name: "daily_yoga_tip" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "daily_yoga_tip",
      body: "{{name}}, your daily practice tip:\n\n{{tip}}\n\nSmall moments of awareness transform the day.\n\n— Mukha Mudra",
      variables: ["name", "tip"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "breathing_exercise" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "breathing_exercise",
      body: "{{name}}, take a moment to breathe.\n\n{{exercise_name}}:\n{{exercise_steps}}\n\nDuration: {{duration}}\n\nBreath is the quietest form of strength.\n\n— Mukha Mudra",
      variables: ["name", "exercise_name", "exercise_steps", "duration"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "mindfulness_moment" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "mindfulness_moment",
      body: "{{name}}, a moment of stillness for you:\n\n{{mindfulness_prompt}}\n\nCarry this awareness through your day.\n\n— Mukha Mudra",
      variables: ["name", "mindfulness_prompt"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "nutrition_advice" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "nutrition_advice",
      body: "{{name}}, nourishment for the practice:\n\n{{nutrition_tip}}\n\nWhat you feed the body, the practice reflects.\n\n— Mukha Mudra",
      variables: ["name", "nutrition_tip"],
      isActive: true,
    },
  });

  // ── 13. New Plan & Recording Templates (6) ──────
  await prisma.messageTemplate.upsert({
    where: { name: "recording_available" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "recording_available",
      body: "{{name}}, the recording from your {{sessionTitle}} session on {{sessionDate}} is now available.\n\nWatch it from your Recordings page in the dashboard. Revisit, refine, repeat.\n\n— Mukha Mudra",
      variables: ["name", "sessionTitle", "sessionDate"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "recording_addon_purchased" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "recording_addon_purchased",
      body: "{{name}}, your Recording Access is now active.\n\nValid until: {{expiresAt}}\n\nYou can now view all session recordings — Face Yoga and Pranayama — from your dashboard.\n\nPractise, review, grow.\n\n— Mukha Mudra",
      variables: ["name", "expiresAt"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "bundle_welcome" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "bundle_welcome",
      body: "{{userName}}, welcome to the complete Mukha Mudra experience.\n\nYour Face Yoga + Pranayama bundle is active until {{periodEnd}}.\n\nYou now have access to all 4 batches — morning Pranayama and evening Face Yoga. Visit your dashboard to explore the schedule.\n\nThe full practice awaits.\n\n— Mukha Mudra",
      variables: ["userName", "periodEnd"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "annual_plan_renewal" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "annual_plan_renewal",
      body: "{{name}}, your {{planName}} subscription renews on {{renewalDate}}.\n\nA year of practice — that is commitment worth celebrating. If you wish to make any changes, visit your billing page.\n\n— Mukha Mudra",
      variables: ["name", "planName", "renewalDate"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "batch_selection_reminder" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "batch_selection_reminder",
      body: "{{name}}, you have not yet selected a batch for {{productName}}.\n\nChoose your preferred time slot from the dashboard to start attending sessions. Consistency begins with a schedule.\n\n— Mukha Mudra",
      variables: ["name", "productName"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "whatsapp_group_invite" },
    update: {},
    create: {
      channel: "WHATSAPP",
      name: "whatsapp_group_invite",
      body: "{{name}}, join your batch WhatsApp group for {{batchName}}.\n\nGroup link: {{groupLink}}\n\nThis is where session reminders, tips, and community updates are shared. We look forward to seeing you there.\n\n— Mukha Mudra",
      variables: ["name", "batchName", "groupLink"],
      isActive: true,
    },
  });

  // ═══════════════════════════════════════════════════
  // Email Templates (8)
  // ═══════════════════════════════════════════════════
  await prisma.messageTemplate.upsert({
    where: { name: "welcome" },
    update: {
      subject: "Welcome to Mukha Mudra — मुख मुद्रा",
      body: "Namaste {{name}},\n\nWelcome to Mukha Mudra.\n\nWe are delighted to have you join our practice. Whether you choose Face Yoga or Pranayama, every session is a step toward radiance.\n\nExplore your options:\n• Face Yoga — Personalised 1:1 sessions for facial toning & glow\n• Pranayama — Daily group breathing sessions for calm & energy\n\nBegin your practice today from your dashboard.\n\nWith warmth,\nMukha Mudra — मुख मुद्रा",
    },
    create: {
      channel: "EMAIL",
      name: "welcome",
      subject: "Welcome to Mukha Mudra — मुख मुद्रा",
      body: "Namaste {{name}},\n\nWelcome to Mukha Mudra.\n\nWe are delighted to have you join our practice. Whether you choose Face Yoga or Pranayama, every session is a step toward radiance.\n\nExplore your options:\n• Face Yoga — Personalised 1:1 sessions for facial toning & glow\n• Pranayama — Daily group breathing sessions for calm & energy\n\nBegin your practice today from your dashboard.\n\nWith warmth,\nMukha Mudra — मुख मुद्रा",
      variables: ["name"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "payment_success" },
    update: {
      subject: "Payment Confirmed — Mukha Mudra",
      body: "{{name}},\n\nYour payment has been received. Thank you.\n\nOrder: #{{order_id}}\nPlan: {{plan_name}}\nAmount: ₹{{amount}}\n\nYou may now book your sessions from your dashboard.\n\nNamaste,\nMukha Mudra",
    },
    create: {
      channel: "EMAIL",
      name: "payment_success",
      subject: "Payment Confirmed — Mukha Mudra",
      body: "{{name}},\n\nYour payment has been received. Thank you.\n\nOrder: #{{order_id}}\nPlan: {{plan_name}}\nAmount: ₹{{amount}}\n\nYou may now book your sessions from your dashboard.\n\nNamaste,\nMukha Mudra",
      variables: ["name", "order_id", "plan_name", "amount"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "booking_confirmed_email" },
    update: {
      subject: "Session Confirmed — {{session_type}} on {{date}}",
      body: "{{name}},\n\nYour booking is confirmed.\n\nSession: {{session_type}}\nDate: {{date}}\nTime: {{time}}\n\nYou will receive the join link before the session begins.\n\nNamaste,\nMukha Mudra",
    },
    create: {
      channel: "EMAIL",
      name: "booking_confirmed_email",
      subject: "Session Confirmed — {{session_type}} on {{date}}",
      body: "{{name}},\n\nYour booking is confirmed.\n\nSession: {{session_type}}\nDate: {{date}}\nTime: {{time}}\n\nYou will receive the join link before the session begins.\n\nNamaste,\nMukha Mudra",
      variables: ["name", "session_type", "date", "time"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "booking_cancelled_email" },
    update: {
      subject: "Booking Cancelled — {{date}}",
      body: "{{name}},\n\nYour session on {{date}} at {{time}} has been cancelled. Your credit has been refunded to your account.\n\nYou may book another session at your convenience from the dashboard.\n\nNamaste,\nMukha Mudra",
    },
    create: {
      channel: "EMAIL",
      name: "booking_cancelled_email",
      subject: "Booking Cancelled — {{date}}",
      body: "{{name}},\n\nYour session on {{date}} at {{time}} has been cancelled. Your credit has been refunded to your account.\n\nYou may book another session at your convenience from the dashboard.\n\nNamaste,\nMukha Mudra",
      variables: ["name", "date", "time"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "session_cancelled_email" },
    update: {
      subject: "Session Cancelled — {{session_type}} on {{date}}",
      body: "{{name}},\n\nWe regret to inform you that the {{session_type}} session on {{date}} at {{time}} has been cancelled.\n\n{{reason}}\n\nYour credit has been refunded automatically. Please book another session at your convenience.\n\nWe apologise for the inconvenience.\n\nNamaste,\nMukha Mudra",
    },
    create: {
      channel: "EMAIL",
      name: "session_cancelled_email",
      subject: "Session Cancelled — {{session_type}} on {{date}}",
      body: "{{name}},\n\nWe regret to inform you that the {{session_type}} session on {{date}} at {{time}} has been cancelled.\n\n{{reason}}\n\nYour credit has been refunded automatically. Please book another session at your convenience.\n\nWe apologise for the inconvenience.\n\nNamaste,\nMukha Mudra",
      variables: ["name", "session_type", "date", "time", "reason"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "credit_expiry_warning_email" },
    update: {
      subject: "Your Credits Are Expiring Soon — Mukha Mudra",
      body: "{{name}},\n\nYou have {{credits}} unused credit(s) expiring on {{expiry_date}}.\n\nBook your sessions before they expire — consistency is the foundation of transformation.\n\nVisit your dashboard to book now.\n\nNamaste,\nMukha Mudra",
    },
    create: {
      channel: "EMAIL",
      name: "credit_expiry_warning_email",
      subject: "Your Credits Are Expiring Soon — Mukha Mudra",
      body: "{{name}},\n\nYou have {{credits}} unused credit(s) expiring on {{expiry_date}}.\n\nBook your sessions before they expire — consistency is the foundation of transformation.\n\nVisit your dashboard to book now.\n\nNamaste,\nMukha Mudra",
      variables: ["name", "credits", "expiry_date"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "membership_activated_email" },
    update: {
      subject: "Your {{plan_name}} Subscription is Active — Mukha Mudra",
      body: "{{name}},\n\nYour {{plan_name}} subscription is now active.\n\nValid until: {{end_date}}\n\nYou may join any scheduled session from your dashboard. We recommend establishing a daily routine for the best results.\n\nNamaste,\nMukha Mudra",
    },
    create: {
      channel: "EMAIL",
      name: "membership_activated_email",
      subject: "Your {{plan_name}} Subscription is Active — Mukha Mudra",
      body: "{{name}},\n\nYour {{plan_name}} subscription is now active.\n\nValid until: {{end_date}}\n\nYou may join any scheduled session from your dashboard. We recommend establishing a daily routine for the best results.\n\nNamaste,\nMukha Mudra",
      variables: ["name", "plan_name", "end_date"],
      isActive: true,
    },
  });

  await prisma.messageTemplate.upsert({
    where: { name: "membership_cancelled_email" },
    update: {
      subject: "Subscription Cancelled — Mukha Mudra",
      body: "{{name}},\n\nYour {{plan_name}} subscription has been cancelled. You may continue to access your sessions until {{end_date}}.\n\nWe would be glad to welcome you back anytime.\n\nNamaste,\nMukha Mudra",
    },
    create: {
      channel: "EMAIL",
      name: "membership_cancelled_email",
      subject: "Subscription Cancelled — Mukha Mudra",
      body: "{{name}},\n\nYour {{plan_name}} subscription has been cancelled. You may continue to access your sessions until {{end_date}}.\n\nWe would be glad to welcome you back anytime.\n\nNamaste,\nMukha Mudra",
      variables: ["name", "plan_name", "end_date"],
      isActive: true,
    },
  });

  console.log("✅ Message templates created (55 WhatsApp + 8 Email = 63 templates)\n");

  console.log("🎉 Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
