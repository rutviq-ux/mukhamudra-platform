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
const RECORDINGS_URL = "https://www.mukhamudra.com/app/recordings";
const GUA_SHA_URL = "https://www.amazon.in/dp/B0B8T59777";
const FACE_CUPPING_URL = "https://www.amazon.in/dp/B0CSWJFSSV";
const FACE_YOGA_TRIAL_URL = "https://www.youtube.com/watch?v=aEG2lSN3lHM";
const PRANAYAMA_TRIAL_URL = "https://youtu.be/GwsLXtbpDVM";
const LINK_SENTENCE =
  "Live class session links will be shared just before the classes on your registered WhatsApp number and email. For non-Indian numbers, links will be shared on email only.";

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

/** Phrases that mean this exact class slot was already announced. Time is included so 8:00 and 9:00 on the same day stay separate. */
export function cancellationNoticePhrases(opts: {
  classType: string;
  date: string;
  time: string;
  legacyType: string;
}): [string, string, string] {
  return [
    `live ${opts.classType} session on ${opts.date} at ${opts.time}`,
    `no live ${opts.classType} class on ${opts.date} at ${opts.time}`,
    `no live ${opts.legacyType} class on ${opts.date} at ${opts.time}`,
  ];
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

const SIGN_OFF = "<p>Warm regards,<br/>Mukha Mudra<br/>+91 9535978749</p>";

function namaste(inner: string): string {
  return `<p>Namaste {{name}},</p>${inner}${SIGN_OFF}`;
}

export const MM_EMAIL_TEMPLATES: MmEmailTemplate[] = [
  {
    name: "mm_pre_payment_info_email",
    subject: "Your Mukha Mudra practice",
    isTransactional: false,
    variables: ["name"],
    body: `<p>Namaste {{name}}, and thank you for reaching out to Mukha Mudra.</p><p>We hold live classes three days a week, on Monday, Wednesday and Friday, with two slots each for Pranayama and Face Yoga on each class day.</p><p><strong>Pranayama</strong> (mornings)<br/>Monday, Wednesday and Friday<br/>Slots: 8:00 AM or 9:00 AM IST (30 mins each)</p><p><strong>Face Yoga</strong> (evenings)<br/>Monday, Wednesday and Friday<br/>Slots: 9:00 PM or 10:00 PM IST (30 mins each)</p><p>You can join any slot that suits you on each class day.</p><p><strong>Fees (annual):</strong><br/>• Face Yoga only: ₹3,000<br/>• Pranayama only: ₹3,000<br/>• Both programs (bundle): ₹6,000</p><p>If you miss a class, no worries. Recordings are included in the same fee, and you can watch anytime.</p><p>Below is the payment link:<br/><a href="${PRICING_URL}">${PRICING_URL}</a></p><p>We look forward to seeing you in class.</p>${SIGN_OFF}`,
  },
  {
    name: "mm_welcome_face_yoga_email",
    subject: "Welcome to Face Yoga",
    isTransactional: true,
    variables: ["name"],
    body: namaste(
      `<p>Thank you for your payment. We're glad to have you on board and look forward to teaching you Face Yoga techniques.</p><p><strong>Class details:</strong><br/>Face Yoga: Monday, Wednesday, Friday<br/>Slots: 9:00 PM or 10:00 PM IST (30 mins each). You can join either one.</p><p>${LINK_SENTENCE}</p><p><strong>Products required for this course:</strong><br/>Please purchase the following before your first class. Links below (Amazon):<br/>1. Gua Sha: <a href="${GUA_SHA_URL}">${GUA_SHA_URL}</a><br/>2. Face Cupping: <a href="${FACE_CUPPING_URL}">${FACE_CUPPING_URL}</a></p><p>Looking forward to seeing you in class.</p>`,
    ),
  },
  {
    name: "mm_welcome_pranayama_email",
    subject: "Welcome to Pranayama",
    isTransactional: true,
    variables: ["name"],
    body: namaste(
      `<p>Thank you for your payment. We're glad to have you on board and look forward to teaching you Pranayama techniques.</p><p><strong>Instructions:</strong><br/>Please attend the class on an empty stomach. Kindly avoid attending if you have a medical condition, or if you are currently on your monthly cycle.</p><p><strong>Class details:</strong><br/>Pranayama: Monday, Wednesday, Friday<br/>Slots: 8:00 AM or 9:00 AM IST (30 mins each). You can join either one.</p><p>${LINK_SENTENCE}</p><p>Looking forward to seeing you in class.</p>`,
    ),
  },
  {
    name: "mm_welcome_bundle_email",
    subject: "Welcome to Face Yoga and Pranayama",
    isTransactional: true,
    variables: ["name"],
    body: namaste(
      `<p>Thank you for your payment. We're glad to have you on board and look forward to teaching you both Face Yoga and Pranayama techniques.</p><p><strong>Instructions for Pranayama:</strong><br/>Please attend the class on an empty stomach. Kindly avoid attending if you have a medical condition, or if you are currently on your monthly cycle.</p><p><strong>Class details:</strong><br/>Pranayama: Monday, Wednesday, Friday<br/>Slots: 8:00 AM or 9:00 AM IST (30 mins each). You can join either one.<br/><br/>Face Yoga: Monday, Wednesday, Friday<br/>Slots: 9:00 PM or 10:00 PM IST (30 mins each). You can join either one.</p><p>${LINK_SENTENCE}</p><p><strong>Products required for Face Yoga:</strong><br/>Please purchase the following before your first class. Links below (Amazon):<br/>1. Gua Sha: <a href="${GUA_SHA_URL}">${GUA_SHA_URL}</a><br/>2. Face Cupping: <a href="${FACE_CUPPING_URL}">${FACE_CUPPING_URL}</a></p><p>Looking forward to seeing you in class.</p>`,
    ),
  },
  {
    name: "mm_join_pranayama_8am_email",
    subject: "Your 8:00 AM Pranayama class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: `<p>Namaste {{name}},</p><p>Your Pranayama session starts at 8:00 AM IST (30 mins).</p><p><strong>Monday's 8:00 AM session:</strong> Nadi Shuddhi, Ujjayi, Anuloma, Kapalbhati, Bhramari, Shambhavi + Nasikagra</p><p><strong>Wednesday's 8:00 AM session:</strong> Viloma, Kumbhakas, Antara + Bahya, Bhastrika, Mantra Chanting</p><p><strong>Friday's 8:00 AM session:</strong> Surya + Chandra, Plavani, Murchha, Shitali, Shitkari</p><p>See you soon!</p><p><a href="{{join_link}}">{{join_link}}</a></p>`,
  },
  {
    name: "mm_join_pranayama_9am_email",
    subject: "Your 9:00 AM Pranayama class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: `<p>Namaste {{name}},</p><p>Your Pranayama session starts at 9:00 AM IST (30 mins).</p><p><strong>Monday's 9:00 AM session:</strong> Viloma, Kumbhakas, Antara + Bahya, Bhastrika, Mantra Chanting</p><p><strong>Wednesday's 9:00 AM session:</strong> Surya + Chandra, Plavani, Murchha, Shitali, Shitkari</p><p><strong>Friday's 9:00 AM session:</strong> Nadi Shuddhi, Ujjayi, Anuloma, Kapalbhati, Bhramari, Shambhavi + Nasikagra</p><p>See you soon!</p><p><a href="{{join_link}}">{{join_link}}</a></p>`,
  },
  {
    name: "mm_join_face_yoga_9pm_email",
    subject: "Your 9:00 PM Face Yoga class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: `<p>Namaste {{name}},</p><p>Your Mukha Mudra session starts at 9:00 PM IST (30 mins).</p><p><strong>Monday's 9:00 PM session:</strong> Face Mudras</p><p><strong>Wednesday's 9:00 PM session:</strong> Gua Sha</p><p><strong>Friday's 9:00 PM session:</strong> Facial Cupping</p><p>See you soon!</p><p><a href="{{join_link}}">{{join_link}}</a></p>`,
  },
  {
    name: "mm_join_face_yoga_10pm_email",
    subject: "Your 10:00 PM Face Yoga class",
    isTransactional: true,
    variables: ["name", "join_link"],
    body: `<p>Namaste {{name}},</p><p>Your Mukha Mudra session starts at 10:00 PM IST (30 mins).</p><p><strong>Monday's 10:00 PM session:</strong> Gua Sha</p><p><strong>Wednesday's 10:00 PM session:</strong> Facial Cupping</p><p><strong>Friday's 10:00 PM session:</strong> Face Mudras</p><p>See you soon!</p><p><a href="{{join_link}}">{{join_link}}</a></p>`,
  },
  {
    name: "mm_no_live_session_email",
    subject: "No live {{class_type}} class on {{date}} at {{time}}",
    isTransactional: true,
    variables: ["name", "class_type", "date", "time"],
    body: `<p>Namaste {{name}},</p><p>Due to unforeseen personal reasons, today's live {{class_type}} session on {{date}} at {{time}} will not be held.</p><p>We're sorry for the inconvenience. Please click the link to view your recording: <a href="${RECORDINGS_URL}">${RECORDINGS_URL}</a></p><p>Thank you for your understanding, and we'll see you at the next live session.</p>${SIGN_OFF}`,
  },
  {
    name: "mm_renewal_email",
    subject: "Your Mukha Mudra membership renews soon",
    isTransactional: true,
    variables: ["name", "end_date", "program"],
    body: namaste(
      `<p>Your one-year Mukha Mudra membership ends on <strong>{{end_date}}</strong>.</p><p>We hope this year has brought consistency and visible change to your practice. To continue your {{program}} sessions without a break, please renew before this date.</p><p><strong>Renewal fees (annual):</strong><br/>• Face Yoga only: ₹3,000<br/>• Pranayama only: ₹3,000<br/>• Both programs (bundle): ₹6,000</p><p>Below is the renewal link:<br/><a href="${PRICING_URL}">${PRICING_URL}</a></p><p>Looking forward to continuing this practice with you.</p>`,
    ),
  },
  {
    name: "mm_trial_class_email",
    subject: "Your Mukha Mudra trial class",
    isTransactional: false,
    variables: ["name"],
    body: `<p>Namaste {{name}},</p><p>Thank you for your interest in Mukha Mudra.</p><p>Here are two trial videos to show you what our sessions look like:</p><p><strong>Face Yoga trial reel:</strong><br/><a href="${FACE_YOGA_TRIAL_URL}">${FACE_YOGA_TRIAL_URL}</a></p><p><strong>Pranayama trial reel:</strong><br/><a href="${PRANAYAMA_TRIAL_URL}">${PRANAYAMA_TRIAL_URL}</a></p><p>If you have been thinking about starting, this is a good time. You can join the class using the link below:<br/><a href="${TRIAL_URL}">${TRIAL_URL}</a></p>`,
  },
];
