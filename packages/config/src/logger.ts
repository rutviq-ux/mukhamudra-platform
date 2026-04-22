import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";

const baseLogger = pino({
  level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "pid,hostname",
            translateTime: "HH:MM:ss",
          },
        },
      }
    : {}),
});

/**
 * Create a named child logger.
 * Usage: `const log = createLogger("api:bookings")`
 */
export function createLogger(name: string) {
  return baseLogger.child({ module: name });
}

export { baseLogger as logger };
