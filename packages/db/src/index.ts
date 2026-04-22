export { prisma } from "./client";

// Re-export only what's actually used from the generated Prisma client.
// Using `export *` on the CJS generated client causes Turbopack warnings
// because CJS exports aren't statically analyzable.
export { Prisma, PrismaClient } from "@prisma/client";

// Enums (runtime values)
export {
  UserRole,
  ProductType,
  PlanType,
  OrderStatus,
  MembershipStatus,
  SessionType,
  SessionStatus,
  BookingStatus,
  AffiliateCategory,
  DiscountType,
  WebhookEventStatus,
  MediaType,
  MessageChannel,
  MessageStatus,
} from "@prisma/client";

// Model types (compile-time only)
export type {
  User,
  Product,
  Plan,
  Order,
  Membership,
  Batch,
  Session,
  Booking,
  Attendance,
  AffiliateProduct,
  Coupon,
  WebhookEvent,
  ProgressMedia,
  Course,
  Exercise,
  CourseExercise,
  UserCourseProgress,
  MessageTemplate,
  MessageLog,
  AuditLog,
  RateLimitBucket,
  Setting,
} from "@prisma/client";
