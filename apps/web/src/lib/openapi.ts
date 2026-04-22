/**
 * OpenAPI 3.1 specification for RU Yoga API
 */
export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Mukha Mudra API",
    version: "1.0.0",
    description:
      "API for the Mukha Mudra platform - Face Yoga & Pranayama online booking, payments, and content management.",
    contact: { name: "Mukha Mudra", url: "https://mukhamudra.com" },
  },
  servers: [
    { url: "/api", description: "Current environment" },
  ],
  tags: [
    { name: "Health", description: "Health check endpoints" },
    { name: "Auth", description: "User profile and authentication" },
    { name: "Bookings", description: "Session booking management" },
    { name: "Payments", description: "Razorpay checkout and subscriptions" },
    { name: "Progress", description: "User progress tracking" },
    { name: "Newsletter", description: "Newsletter subscription" },
    { name: "Admin: Sessions", description: "Admin session management" },
    { name: "Admin: Batches", description: "Admin batch management" },
    { name: "Admin: Coupons", description: "Admin coupon management" },
    { name: "Admin: Templates", description: "Admin message templates" },
    { name: "Admin: Users", description: "Admin user management" },
    { name: "Admin: Settings", description: "Admin settings" },
    { name: "Coach", description: "Coach attendance tracking" },
    { name: "Cron", description: "Scheduled job endpoints" },
    { name: "Webhooks", description: "Payment provider webhooks" },
  ],
  paths: {
    // Health
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Basic health check",
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, uptime: { type: "number" } } } } } } },
      },
    },
    "/health/db": {
      get: {
        tags: ["Health"],
        summary: "Database health check",
        responses: { "200": { description: "Database is healthy" }, "500": { description: "Database connection failed" } },
      },
    },
    "/health/services": {
      get: {
        tags: ["Health"],
        summary: "External services health check",
        description: "Check status of WhatsApp bot, Ghost CMS, and Listmonk.",
        responses: { "200": { description: "Service status report" } },
      },
    },

    // Auth / User
    "/user/update": {
      post: {
        tags: ["Auth"],
        summary: "Update user profile",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/UserUpdate" } } } },
        responses: { "200": { description: "Profile updated" }, "401": { description: "Unauthorized" } },
      },
    },

    // Bookings
    "/bookings": {
      get: {
        tags: ["Bookings"],
        summary: "List user bookings",
        security: [{ clerk: [] }],
        parameters: [
          { name: "startDate", in: "query", schema: { type: "string", format: "date" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date" } },
        ],
        responses: { "200": { description: "List of bookings" } },
      },
      post: {
        tags: ["Bookings"],
        summary: "Create a booking",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBooking" } } } },
        responses: { "200": { description: "Booking created" }, "400": { description: "Validation error" }, "402": { description: "Insufficient credits" } },
      },
      delete: {
        tags: ["Bookings"],
        summary: "Cancel a booking",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CancelBooking" } } } },
        responses: { "200": { description: "Booking cancelled" } },
      },
    },

    "/join/{sessionId}": {
      get: {
        tags: ["Bookings"],
        summary: "Get session join link",
        security: [{ clerk: [] }],
        parameters: [{ name: "sessionId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Join URL" }, "403": { description: "Not eligible" } },
      },
    },

    // Payments
    "/razorpay/checkout": {
      post: {
        tags: ["Payments"],
        summary: "Create checkout order",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Checkout" } } } },
        responses: { "200": { description: "Razorpay order created" } },
      },
    },
    "/razorpay/subscription": {
      post: {
        tags: ["Payments"],
        summary: "Create subscription",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Subscription" } } } },
        responses: { "200": { description: "Razorpay subscription created" } },
      },
    },
    "/razorpay/webhook": {
      post: {
        tags: ["Webhooks"],
        summary: "Razorpay webhook handler",
        description: "Processes payment.captured, subscription.activated/charged/cancelled, and payment.failed events.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RazorpayWebhook" } } } },
        responses: { "200": { description: "Webhook processed" }, "401": { description: "Invalid signature" } },
      },
    },
    "/memberships/cancel": {
      post: {
        tags: ["Payments"],
        summary: "Cancel membership subscription",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { membershipId: { type: "string" } }, required: ["membershipId"] } } } },
        responses: { "200": { description: "Membership cancelled" } },
      },
    },

    // Progress
    "/progress": {
      get: {
        tags: ["Progress"],
        summary: "Get user progress media",
        security: [{ clerk: [] }],
        responses: { "200": { description: "List of progress entries" } },
      },
      post: {
        tags: ["Progress"],
        summary: "Upload progress photo",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "multipart/form-data": { schema: { $ref: "#/components/schemas/ProgressUpload" } } } },
        responses: { "200": { description: "Photo uploaded" } },
      },
    },

    // Newsletter
    "/newsletter/subscribe": {
      post: {
        tags: ["Newsletter"],
        summary: "Subscribe to newsletter",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/NewsletterSubscribe" } } } },
        responses: { "200": { description: "Subscribed" }, "400": { description: "Validation error" } },
      },
    },

    // Admin: Sessions
    "/admin/sessions": {
      get: {
        tags: ["Admin: Sessions"],
        summary: "List sessions",
        security: [{ clerk: [] }],
        parameters: [
          { name: "batchId", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: { "200": { description: "List of sessions" } },
      },
    },
    "/admin/sessions/{id}": {
      put: {
        tags: ["Admin: Sessions"],
        summary: "Update a session",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SessionUpdate" } } } },
        responses: { "200": { description: "Session updated" } },
      },
    },

    // Admin: Batches
    "/admin/batches": {
      get: { tags: ["Admin: Batches"], summary: "List batches", security: [{ clerk: [] }], responses: { "200": { description: "List of batches" } } },
      post: {
        tags: ["Admin: Batches"],
        summary: "Create a batch",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Batch" } } } },
        responses: { "201": { description: "Batch created" } },
      },
    },
    "/admin/batches/{id}": {
      put: {
        tags: ["Admin: Batches"],
        summary: "Update a batch",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Batch" } } } },
        responses: { "200": { description: "Batch updated" } },
      },
      delete: {
        tags: ["Admin: Batches"],
        summary: "Delete a batch",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Batch deleted" } },
      },
    },

    // Admin: Coupons
    "/admin/coupons": {
      get: { tags: ["Admin: Coupons"], summary: "List coupons", security: [{ clerk: [] }], responses: { "200": { description: "List of coupons" } } },
      post: {
        tags: ["Admin: Coupons"],
        summary: "Create a coupon",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Coupon" } } } },
        responses: { "201": { description: "Coupon created" } },
      },
    },
    "/admin/coupons/{id}": {
      put: {
        tags: ["Admin: Coupons"],
        summary: "Update a coupon",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Coupon" } } } },
        responses: { "200": { description: "Coupon updated" } },
      },
      delete: {
        tags: ["Admin: Coupons"],
        summary: "Delete a coupon",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Coupon deactivated" } },
      },
    },

    // Admin: Templates
    "/admin/templates": {
      get: { tags: ["Admin: Templates"], summary: "List message templates", security: [{ clerk: [] }], responses: { "200": { description: "List of templates" } } },
      post: {
        tags: ["Admin: Templates"],
        summary: "Create a message template",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MessageTemplate" } } } },
        responses: { "201": { description: "Template created" } },
      },
    },
    "/admin/templates/{id}": {
      put: {
        tags: ["Admin: Templates"],
        summary: "Update a template",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MessageTemplate" } } } },
        responses: { "200": { description: "Template updated" } },
      },
      delete: {
        tags: ["Admin: Templates"],
        summary: "Delete a template",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Template deleted" } },
      },
    },

    // Admin: Users
    "/admin/users/{id}": {
      get: {
        tags: ["Admin: Users"],
        summary: "Get user details",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "User details with orders, memberships, bookings" } },
      },
      patch: {
        tags: ["Admin: Users"],
        summary: "Update user (role, credits)",
        security: [{ clerk: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "User updated" } },
      },
    },

    // Admin: Settings
    "/admin/settings/whatsapp-rate-limit": {
      get: { tags: ["Admin: Settings"], summary: "Get WhatsApp rate limits", security: [{ clerk: [] }], responses: { "200": { description: "Current rate limits" } } },
      post: {
        tags: ["Admin: Settings"],
        summary: "Update WhatsApp rate limits",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/WhatsAppRateLimit" } } } },
        responses: { "200": { description: "Rate limits updated" } },
      },
    },
    "/admin/whatsapp-qr": {
      get: { tags: ["Admin: Settings"], summary: "Get WhatsApp QR code", security: [{ clerk: [] }], responses: { "200": { description: "QR code data" } } },
    },
    "/admin/send-test-message": {
      post: {
        tags: ["Admin: Settings"],
        summary: "Send test notification",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/SendTestMessage" } } } },
        responses: { "200": { description: "Test message sent" } },
      },
    },

    // Coach
    "/coach/attendance": {
      post: {
        tags: ["Coach"],
        summary: "Mark/unmark attendance",
        security: [{ clerk: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Attendance" } } } },
        responses: { "200": { description: "Attendance recorded" } },
      },
    },

    // Cron
    "/cron/generate-sessions": { post: { tags: ["Cron"], summary: "Auto-generate sessions from batches", responses: { "200": { description: "Sessions generated" } } } },
    "/cron/session-reminders": { post: { tags: ["Cron"], summary: "Send session reminders", responses: { "200": { description: "Reminders sent" } } } },
    "/cron/expire-credits": { post: { tags: ["Cron"], summary: "Expire old credits", responses: { "200": { description: "Credits expired" } } } },
    "/cron/retry-messages": { post: { tags: ["Cron"], summary: "Retry failed messages", responses: { "200": { description: "Messages retried" } } } },
  },
  components: {
    securitySchemes: {
      clerk: { type: "http", scheme: "bearer", description: "Clerk session token" },
    },
    schemas: {
      UserUpdate: {
        type: "object",
        properties: {
          name: { type: "string", maxLength: 100 },
          phone: { type: "string", pattern: "^\\+?[1-9]\\d{6,14}$", nullable: true },
          whatsappOptIn: { type: "boolean" },
          marketingOptIn: { type: "boolean" },
          timezone: { type: "string", maxLength: 50 },
        },
      },
      CreateBooking: {
        type: "object",
        required: ["sessionId"],
        properties: { sessionId: { type: "string", format: "uuid" } },
      },
      CancelBooking: {
        type: "object",
        required: ["bookingId"],
        properties: { bookingId: { type: "string", format: "uuid" } },
      },
      Checkout: {
        type: "object",
        required: ["planSlug"],
        properties: {
          planSlug: { type: "string" },
          couponCode: { type: "string" },
        },
      },
      Subscription: {
        type: "object",
        required: ["batchSlug"],
        properties: { batchSlug: { type: "string" } },
      },
      RazorpayWebhook: {
        type: "object",
        required: ["event", "payload"],
        properties: {
          event: { type: "string" },
          payload: { type: "object" },
        },
      },
      NewsletterSubscribe: {
        type: "object",
        required: ["email", "optIn"],
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string", maxLength: 100 },
          optIn: { type: "boolean", const: true },
        },
      },
      ProgressUpload: {
        type: "object",
        required: ["type"],
        properties: {
          type: { type: "string", enum: ["BEFORE", "AFTER", "WEEKLY"] },
          notes: { type: "string", maxLength: 500 },
          weekNumber: { type: "integer", minimum: 1, maximum: 60 },
          file: { type: "string", format: "binary" },
        },
      },
      Attendance: {
        type: "object",
        required: ["sessionId", "userId", "attended"],
        properties: {
          sessionId: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          attended: { type: "boolean" },
        },
      },
      SessionUpdate: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
          title: { type: "string", maxLength: 200, nullable: true },
          description: { type: "string", maxLength: 1000, nullable: true },
          joinUrl: { type: "string", format: "uri", nullable: true },
          capacity: { type: "integer", minimum: 1 },
          coachId: { type: "string", nullable: true },
        },
      },
      Batch: {
        type: "object",
        required: ["productId", "name", "slug", "daysOfWeek", "startTime", "durationMin", "capacity"],
        properties: {
          productId: { type: "string" },
          name: { type: "string", maxLength: 100 },
          slug: { type: "string", pattern: "^[a-z0-9-]+$" },
          description: { type: "string", maxLength: 500, nullable: true },
          daysOfWeek: { type: "array", items: { type: "integer", minimum: 0, maximum: 6 } },
          startTime: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          durationMin: { type: "integer", minimum: 5, maximum: 480 },
          timezone: { type: "string", default: "Asia/Kolkata" },
          capacity: { type: "integer", minimum: 1 },
          isActive: { type: "boolean", default: true },
        },
      },
      Coupon: {
        type: "object",
        required: ["code", "discountType", "discountValue"],
        properties: {
          code: { type: "string", maxLength: 50 },
          discountType: { type: "string", enum: ["PERCENTAGE", "FIXED"] },
          discountValue: { type: "integer", minimum: 1 },
          minOrderPaise: { type: "integer", nullable: true },
          maxDiscountPaise: { type: "integer", nullable: true },
          maxUses: { type: "integer", nullable: true },
          validFrom: { type: "string", format: "date-time" },
          validUntil: { type: "string", format: "date-time", nullable: true },
          isActive: { type: "boolean", default: true },
        },
      },
      MessageTemplate: {
        type: "object",
        required: ["name", "channel", "body"],
        properties: {
          name: { type: "string", pattern: "^[a-z0-9_]+$" },
          channel: { type: "string", enum: ["EMAIL", "WHATSAPP"] },
          subject: { type: "string", maxLength: 200, nullable: true },
          body: { type: "string", maxLength: 5000 },
          variables: { type: "array", items: { type: "string" } },
          isActive: { type: "boolean", default: true },
        },
      },
      WhatsAppRateLimit: {
        type: "object",
        required: ["perMinute", "perDay"],
        properties: {
          perMinute: { type: "integer", minimum: 1 },
          perDay: { type: "integer", minimum: 1 },
        },
      },
      SendTestMessage: {
        type: "object",
        required: ["templateId", "channel", "testRecipient"],
        properties: {
          templateId: { type: "string" },
          channel: { type: "string", enum: ["EMAIL", "WHATSAPP"] },
          testRecipient: { type: "string" },
        },
      },
    },
  },
} as const;
