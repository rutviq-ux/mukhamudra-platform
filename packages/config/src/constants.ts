// User Roles
export const UserRole = {
  USER: "USER",
  ADMIN: "ADMIN",
  OPS: "OPS",
  COACH: "COACH",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Product Types
export const ProductType = {
  FACE_YOGA: "FACE_YOGA",
  PRANAYAMA: "PRANAYAMA",
  BUNDLE: "BUNDLE",
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

// Plan Interval (for subscription billing cycles)
export const PlanInterval = {
  MONTHLY: "MONTHLY",
  ANNUAL: "ANNUAL",
} as const;
export type PlanInterval = (typeof PlanInterval)[keyof typeof PlanInterval];

// Plan Types
export const PlanType = {
  ONE_TIME: "ONE_TIME", // For one-time purchases (e.g., recording add-on)
  SUBSCRIPTION: "SUBSCRIPTION",
} as const;
export type PlanType = (typeof PlanType)[keyof typeof PlanType];

// Order Status
export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

// Membership Status
export const MembershipStatus = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;
export type MembershipStatus =
  (typeof MembershipStatus)[keyof typeof MembershipStatus];

// Session Type
export const SessionType = {
  GROUP: "GROUP",
} as const;
export type SessionType = (typeof SessionType)[keyof typeof SessionType];

// Booking Status
export const BookingStatus = {
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

// Webhook Event Status
export const WebhookEventStatus = {
  PENDING: "PENDING",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
  IGNORED: "IGNORED",
} as const;
export type WebhookEventStatus =
  (typeof WebhookEventStatus)[keyof typeof WebhookEventStatus];

// Message Channels
export const MessageChannel = {
  EMAIL: "EMAIL",
  WHATSAPP: "WHATSAPP",
  INSTAGRAM: "INSTAGRAM",
} as const;
export type MessageChannel =
  (typeof MessageChannel)[keyof typeof MessageChannel];

// Message Status
export const MessageStatus = {
  QUEUED: "QUEUED",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

// Media Type for Progress
export const MediaType = {
  BEFORE: "BEFORE",
  AFTER: "AFTER",
  WEEKLY: "WEEKLY",
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];

// Config Constants
export const CONFIG = {
  // Join window (minutes before/after session start)
  JOIN_WINDOW_BEFORE_MIN: 15,
  JOIN_WINDOW_AFTER_MIN: 30,

  // Session generation
  SESSION_GENERATION_DAYS: 30,

  // Rate limits
  WHATSAPP_RATE_LIMIT_PER_MINUTE: 10,
  WHATSAPP_RATE_LIMIT_PER_DAY: 100,

  // Currency (India)
  CURRENCY: "INR",
  CURRENCY_SUBUNIT: 100, // paise

  // Default timezone
  DEFAULT_TIMEZONE: "Asia/Kolkata",

  // Recording add-on
  RECORDING_ADDON_PAISE: 100000, // ₹1,000
  RECORDING_ACCESS_DAYS: 365, // 1 year

  // Default coach assigned to auto-generated sessions
  DEFAULT_COACH_EMAIL: "rutviq@mukhamudra.com",
} as const;

// Days of week for batch recurrence
export const DayOfWeek = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;
export type DayOfWeek = (typeof DayOfWeek)[keyof typeof DayOfWeek];

// Modalities by product type
export const MODALITIES = {
  FACE_YOGA: [
    "Face Yoga",
    "Gua Sha",
    "Roller Therapy",
    "Trataka",
    "Osteopathy",
    "Cupping",
    "Acupressure",
  ],
  PRANAYAMA: [
    "Sama Vritti",
    "Ujjayi",
    "Nadi Shodhana",
    "Kumbhaka",
    "Mula Bandha",
    "Jalandhara Bandha",
    "Bhastrika",
    "Kapalabhati",
    "Surya Bhedana",
    "Kevala Kumbhaka",
  ],
} as const;
