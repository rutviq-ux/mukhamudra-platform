import { z } from "zod";

// Phone validation helper (reused across schemas)
const phoneRegex = /^\+?[1-9]\d{6,14}$/;

// Lead capture schema (trial page, popup, etc.)
export const leadSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .transform((val) => val.trim()),
  email: z
    .string()
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase().trim())
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .min(1, "WhatsApp number is required")
    .transform((val) => val.replace(/[\s\-()]/g, ""))
    .pipe(
      z.string().regex(phoneRegex, "Please enter a valid phone number (e.g. +919876543210)")
    ),
  source: z.string().max(50).default("trial"),
});

export type LeadInput = z.infer<typeof leadSchema>;

// Subscription API schema
export const subscriptionSchema = z.object({
  planSlug: z.string().min(1, "Plan slug is required"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms & Conditions" }),
  }),
  autoRenew: z.boolean().optional().default(false),
});

export type SubscriptionInput = z.infer<typeof subscriptionSchema>;

// Recording add-on purchase schema
export const recordingAddonSchema = z.object({
  // No fields needed — user is inferred from auth, eligibility checked server-side
});

export type RecordingAddonInput = z.infer<typeof recordingAddonSchema>;

// User update API schema
export const userUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(100, "Name is too long")
    .transform((val) => val.trim())
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{6,14}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  goal: z.enum(["face-yoga", "pranayama", "both"]).optional(),
  whatsappOptIn: z.boolean().optional(),
  marketingOptIn: z.boolean().optional(),
  pushOptIn: z.boolean().optional(),
  timezone: z.string().max(50, "Invalid timezone").optional(),
  termsAccepted: z.boolean().optional(),
});

export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

// Attendance API schema
export const attendanceSchema = z.object({
  sessionId: z.string().cuid("Invalid session ID"),
  userId: z.string().cuid("Invalid user ID"),
  attended: z.boolean(),
});

export type AttendanceInput = z.infer<typeof attendanceSchema>;

// Newsletter subscribe API schema (already in newsletter route, but exported for consistency)
export const newsletterSubscribeSchema = z.object({
  email: z.string().email("Invalid email address").transform((val) => val.toLowerCase().trim()),
  name: z.string().max(100).transform((val) => val?.trim()).optional(),
  optIn: z.boolean().refine((val) => val === true, {
    message: "You must consent to receive emails",
  }),
});

export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

// Booking API schema (for the booking page we'll create)
export const createBookingSchema = z.object({
  sessionId: z.string().cuid("Invalid session ID"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// Cancel booking schema
export const cancelBookingSchema = z.object({
  bookingId: z.string().cuid("Invalid booking ID"),
});

export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;

const isValidDateString = (value: string) => !Number.isNaN(Date.parse(value));

// Booking query params schema
export const bookingQuerySchema = z.object({
  startDate: z
    .string()
    .refine(isValidDateString, "Invalid start date")
    .optional(),
  endDate: z
    .string()
    .refine(isValidDateString, "Invalid end date")
    .optional(),
});

export type BookingQueryInput = z.infer<typeof bookingQuerySchema>;

// Join session API schema
export const joinSessionSchema = z.object({
  sessionId: z.string().cuid("Invalid session ID"),
});

export type JoinSessionInput = z.infer<typeof joinSessionSchema>;

// Razorpay webhook schema (minimal validation for known event fields)
export const razorpayWebhookSchema = z
  .object({
    event: z.string().min(1, "Event is required"),
    payload: z
      .object({
        payment: z
          .object({
            entity: z.object({
              id: z.string().min(1, "Payment ID is required"),
              order_id: z.string().optional(),
            }),
          })
          .optional(),
        subscription: z
          .object({
            entity: z.object({
              id: z.string().min(1, "Subscription ID is required"),
              current_start: z.number().optional(),
              current_end: z.number().optional(),
            }),
          })
          .optional(),
      })
      .passthrough(),
  })
  .passthrough();

export type RazorpayWebhookInput = z.infer<typeof razorpayWebhookSchema>;

// WhatsApp rate limit settings schema (admin)
export const whatsappRateLimitSchema = z.object({
  perMinute: z.number().int().min(1, "Per-minute limit must be at least 1"),
  perDay: z.number().int().min(1, "Per-day limit must be at least 1"),
});

export type WhatsappRateLimitInput = z.infer<typeof whatsappRateLimitSchema>;

// Admin test message schema
export const sendTestMessageSchema = z
  .object({
    templateId: z.string().cuid("Invalid template ID"),
    channel: z.enum(["EMAIL", "WHATSAPP", "INSTAGRAM", "PUSH"]),
    testRecipient: z.string().min(1, "Recipient is required"),
    variables: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.channel === "EMAIL") {
      if (!z.string().email().safeParse(data.testRecipient).success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid email address",
          path: ["testRecipient"],
        });
      }
    }

    if (data.channel === "WHATSAPP") {
      const phoneRegex = /^\+?[1-9]\d{6,14}$/;
      if (!phoneRegex.test(data.testRecipient)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid phone number format",
          path: ["testRecipient"],
        });
      }
    }
  });

export type SendTestMessageInput = z.infer<typeof sendTestMessageSchema>;

// Admin message template schema
export const messageTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .regex(/^[a-z0-9_]+$/, "Name must be lowercase with underscores only"),
  channel: z.enum(["EMAIL", "WHATSAPP", "INSTAGRAM", "PUSH"]),
  subject: z.string().max(200, "Subject is too long").optional().nullable(),
  body: z.string().min(1, "Body is required").max(5000, "Body is too long"),
  variables: z.array(z.string().min(1).max(50)).default([]),
  isActive: z.boolean().default(true),
});

export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;

// Admin batch schema
export const batchSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  description: z.string().max(500).optional().nullable(),
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .min(1, "At least one day is required"),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format"),
  durationMin: z.number().int().min(5).max(480),
  timezone: z.string().min(1).max(50).default("Asia/Kolkata"),
  capacity: z.number().int().min(1).max(1000),
  modalities: z.array(z.string().max(50)).default([]),
  dayModalities: z
    .record(z.string(), z.array(z.string().max(50)))
    .optional()
    .nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type BatchInput = z.infer<typeof batchSchema>;

// Admin session update schema
export const sessionUpdateSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  joinUrl: z.string().url("Invalid URL").max(500).optional().nullable(),
  calendarEventId: z.string().max(500).optional().nullable(),
  meetingId: z.string().max(100).optional().nullable(),
  recordingUrl: z.string().url("Invalid URL").max(1000).optional().nullable(),
  capacity: z.number().int().min(1).max(1000).optional(),
  coachId: z.string().cuid("Invalid coach ID").optional().nullable(),
});

export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;

// Admin coupon schema
export const couponSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(50)
    .transform((val) => val.toUpperCase().trim()),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().int().min(1, "Discount must be at least 1"),
  minOrderPaise: z.number().int().min(0).optional().nullable(),
  maxDiscountPaise: z.number().int().min(0).optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  validFrom: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date").optional(),
  validUntil: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date").optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CouponInput = z.infer<typeof couponSchema>;

// Admin affiliate product schema
export const affiliateProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).transform((v) => v.trim()),
  slug: z.string().min(1, "Slug is required").max(200).regex(/^[a-z0-9-]+$/, "Lowercase with hyphens only"),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url("Invalid image URL").max(1000),
  affiliateUrl: z.string().url("Invalid URL").max(2000),
  displayPrice: z.string().min(1, "Price is required").max(50),
  category: z.enum(["GUA_SHA", "ROLLER", "OIL", "CREAM", "BOOK", "MAT", "PROP", "OTHER"]),
  practiceTypes: z.array(z.enum(["FACE_YOGA", "PRANAYAMA", "BUNDLE"])).min(1, "At least one practice type"),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export type AffiliateProductInput = z.infer<typeof affiliateProductSchema>;

// Admin sequence schema
export const sequenceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  description: z.string().max(500).optional().nullable(),
  triggerEvent: z.string().min(1, "Trigger event is required").max(100),
  cancelEvents: z.array(z.string().min(1).max(100)).default([]),
  isActive: z.boolean().default(true),
});

export type SequenceInput = z.infer<typeof sequenceSchema>;

// Admin sequence step schema
export const sequenceStepSchema = z.object({
  templateId: z.string().min(1, "Template is required"),
  stepOrder: z.number().int().min(1, "Step order must be at least 1"),
  delayMinutes: z.number().int().min(0, "Delay cannot be negative").default(0),
  isActive: z.boolean().default(true),
});

export type SequenceStepInput = z.infer<typeof sequenceStepSchema>;

// Admin broadcast schema
export const broadcastSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  templateId: z.string().min(1, "Template is required"),
  variables: z.record(z.string()).default({}),
  segment: z.object({
    audience: z.enum(["users", "leads", "all"]).default("users"),
    hasActiveMembership: z.boolean().optional(),
    goal: z.array(z.string()).optional(),
    onboardedBefore: z.string().optional(),
    onboardedAfter: z.string().optional(),
    lastAttendedBefore: z.string().optional(),
    membershipStatus: z.array(z.string()).optional(),
  }),
  scheduledFor: z.string().datetime().optional().nullable(),
});

export type BroadcastInput = z.infer<typeof broadcastSchema>;

// Admin plan schema
export const planSchema = z.object({
  productId: z.string().cuid("Invalid product ID"),
  name: z.string().min(1, "Name is required").max(200),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase with hyphens only"),
  type: z.enum(["ONE_TIME", "SUBSCRIPTION"]),
  amountPaise: z.number().int().min(0, "Amount must be non-negative"),
  durationDays: z.number().int().min(1).optional().nullable(),
  razorpayPlanId: z.string().max(200).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  features: z.array(z.string().max(200)).default([]),
  isPopular: z.boolean().default(false),
  isActive: z.boolean().default(true),
  interval: z.enum(["MONTHLY", "ANNUAL"]).optional().nullable(),
  sortOrder: z.number().int().min(0).default(0),
});

export type PlanInput = z.infer<typeof planSchema>;

// Admin user create schema
export const adminCreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  phone: z.string().max(20).optional(),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(["USER", "COACH", "OPS", "ADMIN"]).default("USER"),
});
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

// Admin user update schema
export const adminUpdateUserSchema = z.object({
  name: z.string().max(200).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  marketingOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

// Membership status update schema
export const membershipStatusSchema = z.object({
  status: z.enum(["PENDING", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"]),
  periodEnd: z.string().datetime().optional().nullable(),
});
export type MembershipStatusInput = z.infer<typeof membershipStatusSchema>;

// Progress upload schema (metadata only; file validated separately)
export const progressUploadSchema = z.object({
  type: z.enum(["BEFORE", "AFTER", "WEEKLY"]),
  notes: z.string().max(500, "Notes are too long").optional(),
  weekNumber: z.number().int().min(1).max(60).optional(),
});

export type ProgressUploadInput = z.infer<typeof progressUploadSchema>;

// Admin booking status update schema
export const bookingStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]),
});
export type BookingStatusInput = z.infer<typeof bookingStatusSchema>;

// Admin order refund schema
export const orderRefundSchema = z.object({
  status: z.literal("REFUNDED"),
});
export type OrderRefundInput = z.infer<typeof orderRefundSchema>;

// Helper function to validate and return typed result or error response
export function validateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors[0]?.message || "Invalid input",
    errors: result.error.errors,
  };
}
