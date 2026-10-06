export const MM = {
  PRE_PAYMENT: "mm_pre_payment_info",
  WELCOME_FACE_YOGA: "mm_welcome_face_yoga",
  WELCOME_PRANAYAMA: "mm_welcome_pranayama",
  WELCOME_BUNDLE: "mm_welcome_bundle",
  JOIN_PRANAYAMA_8AM: "mm_join_pranayama_8am",
  JOIN_PRANAYAMA_9AM: "mm_join_pranayama_9am",
  JOIN_FACE_YOGA_9PM: "mm_join_face_yoga_9pm",
  JOIN_FACE_YOGA_10PM: "mm_join_face_yoga_10pm",
  NO_LIVE_SESSION: "mm_no_live_session",
  RENEWAL: "mm_renewal",
  TRIAL: "mm_trial_class",
} as const;

const PRICING_URL = "https://www.mukhamudra.com/pricing";
const TRIAL_URL = "https://www.mukhamudra.com/trial";
const DASHBOARD_URL = "https://www.mukhamudra.com/app";
const GUA_SHA_URL = "https://www.amazon.in/dp/B09NWM7T4K";
const ROLLER_URL = "https://www.amazon.in/dp/B07QHVWPFW";

const MM_MESSAGE_NAMES = new Set<string>([
  ...Object.values(MM),
  "mm_pre_payment_info_email",
  "mm_welcome_face_yoga_email",
  "mm_welcome_pranayama_email",
  "mm_welcome_bundle_email",
  "mm_join_pranayama_8am_email",
  "mm_join_pranayama_9am_email",
  "mm_join_face_yoga_9pm_email",
  "mm_join_face_yoga_10pm_email",
  "mm_no_live_session_email",
  "mm_renewal_email",
  "mm_trial_class_email",
]);

export function isMmMessageTemplate(name: string | null | undefined): boolean {
  return Boolean(name && MM_MESSAGE_NAMES.has(name));
}

export const BULK_CLASS_EMAILS = [
  "mm_no_live_session_email",
  "mm_join_pranayama_8am_email",
  "mm_join_pranayama_9am_email",
  "mm_join_face_yoga_9pm_email",
  "mm_join_face_yoga_10pm_email",
] as const;

export function isBulkClassEmail(name: string | null | undefined): boolean {
  return Boolean(name && (BULK_CLASS_EMAILS as readonly string[]).includes(name));
}

export function classNoticeEmailKey(body: string): string | null {
  const match = body.match(
    /<!-- (mm_no_live_session:[a-z0-9]+|session-reminder:[a-z0-9]+) -->/,
  );
  return match?.[1] ?? null;
}

export function sharedClassEmailHtml(body: string): string {
  return body
    .replace(/<p>Dear [^<]*,<\/p>/, "<p>Hello,</p>")
    .replace(/<p>Namaste [^<]*,<\/p>/, "<p>Namaste,</p>")
    .replace(/<!--[\s\S]*?-->/g, "");
}

export function firstName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0] || "there";
}

export function meetCodeFromJoinUrl(
  joinUrl: string | null | undefined,
): string | null {
  if (!joinUrl) return null;
  try {
    const url = new URL(joinUrl);
    if (url.hostname !== "meet.google.com") return null;
    const code = url.pathname.split("/").filter(Boolean)[0];
    return code || null;
  } catch {
    return null;
  }
}

export function joinTemplateForStartTime(startTime: string): string | null {
  switch (startTime) {
    case "08:00":
      return MM.JOIN_PRANAYAMA_8AM;
    case "09:00":
      return MM.JOIN_PRANAYAMA_9AM;
    case "21:00":
      return MM.JOIN_FACE_YOGA_9PM;
    case "22:00":
      return MM.JOIN_FACE_YOGA_10PM;
    default:
      return null;
  }
}

export function welcomeTemplateForSlug(slug: string): string | null {
  if (slug === "face-annual" || slug === "face-monthly") {
    return MM.WELCOME_FACE_YOGA;
  }
  if (slug === "pranayama-annual" || slug === "pranayama-monthly") {
    return MM.WELCOME_PRANAYAMA;
  }
  if (slug === "bundle-annual" || slug === "bundle-monthly") {
    return MM.WELCOME_BUNDLE;
  }
  return null;
}

export function welcomeTemplateForPlanName(planName: string): string | null {
  const planLower = planName.toLowerCase();
  if (planLower.includes("face yoga + pranayama") || planLower.includes("bundle")) {
    return MM.WELCOME_BUNDLE;
  }
  if (planLower.includes("face yoga")) return MM.WELCOME_FACE_YOGA;
  if (planLower.includes("pranayama")) return MM.WELCOME_PRANAYAMA;
  return null;
}

export function programLabel(productType: string): string {
  switch (productType) {
    case "FACE_YOGA":
      return "Face Yoga";
    case "PRANAYAMA":
      return "Pranayama";
    case "BUNDLE":
      return "Face Yoga and Pranayama";
    default:
      return "your program";
  }
}

export function formatInDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export function formatInTime(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  const dayPeriod = parts.find((part) => part.type === "dayPeriod")?.value ?? "";
  return `${hour}:${minute} ${dayPeriod}`;
}

export interface MmEmailTemplate {
  name: string;
  subject: string;
  body: string;
  variables: string[];
  isTransactional: boolean;
}

function letter(inner: string): string {
  return `<p>Dear {{name}},</p>${inner}<p>Namaste,<br/>Mukha Mudra</p>`;
}

export const MM_EMAIL_TEMPLATES: MmEmailTemplate[] = [
  {
    name: "mm_pre_payment_info_email",
    subject: "Your Mukha Mudra practice",
    isTransactional: false,
    variables: ["name"],
    body: letter(
      `<p>Live Face Yoga and Pranayama classes are open for you to join.</p><p><a href="${PRICING_URL}">Pay now</a></p>`,
    ),
  },
  {
    name: "mm_welcome_face_yoga_email",
    subject: "Welcome to Face Yoga",
    isTransactional: true,
    variables: ["name"],
    body: letter(
      `<p>Your Face Yoga membership is active. Classes are on Monday, Wednesday, and Friday at 9:00 PM and 10:00 PM IST. The Google Meet link arrives 15 minutes before class.</p><p>Tools that help you follow along:</p><p><a href="${GUA_SHA_URL}">Gua Sha Stone</a></p><p><a href="${ROLLER_URL}">Facial Massage Roller</a></p><p>Dashboard: <a href="${DASHBOARD_URL}">mukhamudra.com/app</a></p>`,
    ),
  },
  {
    name: "mm_welcome_pranayama_email",
    subject: "Welcome to Pranayama",
    isTransactional: true,
    variables: ["name"],
    body: letter(
      `<p>Your Pranayama membership is active. Classes are on Monday, Wednesday, and Friday at 8:00 AM and 9:00 AM IST. The Google Meet link arrives 15 minutes before class.</p><p>Dashboard: <a href="${DASHBOARD_URL}">mukhamudra.com/app</a></p>`,
    ),
  },
  {
    name: "mm_welcome_bundle_email",
    subject: "Welcome to Face Yoga and Pranayama",
    isTransactional: true,
    variables: ["name"],
    body: letter(
      `<p>Your bundle membership is active. You are in both programs.</p><p>Pranayama: Monday, Wednesday, and Friday at 8:00 AM and 9:00 AM IST.</p><p>Face Yoga: Monday, Wednesday, and Friday at 9:00 PM and 10:00 PM IST.</p><p>The Google Meet link arrives 15 minutes before each class.</p><p>Tools that help you follow along in Face Yoga:</p><p><a href="${GUA_SHA_URL}">Gua Sha Stone</a></p><p><a href="${ROLLER_URL}">Facial Massage Roller</a></p><p>Dashboard: <a href="${DASHBOARD_URL}">mukhamudra.com/app</a></p>`,
    ),
  },
  {
    name: "mm_join_pranayama_8am_email",
    subject: "Your 8:00 AM Pranayama class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: letter(
      `<p>Your 8:00 AM Pranayama class starts in 15 minutes.</p><p><a href="{{join_link}}">Join class</a></p>`,
    ),
  },
  {
    name: "mm_join_pranayama_9am_email",
    subject: "Your 9:00 AM Pranayama class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: letter(
      `<p>Your 9:00 AM Pranayama class starts in 15 minutes.</p><p><a href="{{join_link}}">Join class</a></p>`,
    ),
  },
  {
    name: "mm_join_face_yoga_9pm_email",
    subject: "Your 9:00 PM Face Yoga class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: letter(
      `<p>Your 9:00 PM Face Yoga class starts in 15 minutes.</p><p><a href="{{join_link}}">Join class</a></p>`,
    ),
  },
  {
    name: "mm_join_face_yoga_10pm_email",
    subject: "Your 10:00 PM Face Yoga class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: letter(
      `<p>Your 10:00 PM Face Yoga class starts in 15 minutes.</p><p><a href="{{join_link}}">Join class</a></p>`,
    ),
  },
  {
    name: "mm_no_live_session_email",
    subject: "No live {{class_type}} class on {{date}} at {{time}}",
    isTransactional: true,
    variables: ["name", "class_type", "date", "time"],
    body: `<p>Namaste {{name}},</p><p>Due to unforeseen personal reasons, the live {{class_type}} session on {{date}} at {{time}} will not be held.</p><p>We're sorry for the inconvenience. Please refer to the recording, which will be shared with you shortly.</p><p>Thank you for your understanding, and we'll see you at the next live session.</p><p>Warm regards,<br/>Mukha Mudra</p>`,
  },
  {
    name: "mm_renewal_email",
    subject: "Your Mukha Mudra membership renews soon",
    isTransactional: true,
    variables: ["name", "end_date", "program"],
    body: letter(
      `<p>Your {{program}} membership runs until {{end_date}}.</p><p><a href="${PRICING_URL}">Renew now</a></p>`,
    ),
  },
  {
    name: "mm_trial_class_email",
    subject: "Your Mukha Mudra trial class",
    isTransactional: false,
    variables: ["name"],
    body: letter(
      `<p>Here is your trial class.</p><p><a href="${TRIAL_URL}">Join class</a></p>`,
    ),
  },
];
