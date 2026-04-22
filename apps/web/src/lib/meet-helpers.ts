const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Generate a meeting title in format: "Product (Modalities) — Day Date Month"
 * e.g., "Face Yoga (Gua Sha, Cupping) — Mon 17 Mar"
 */
export function generateMeetingTitle(
  productName: string,
  modalities: string[],
  startsAt: Date,
): string {
  const modsStr = modalities.length > 0 ? ` (${modalities.join(", ")})` : "";
  const dateStr = startsAt.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
  return `${productName}${modsStr} — ${dateStr}`;
}

/**
 * Generate a meeting description with time, modalities, and join link.
 */
export function generateMeetingDescription(
  session: { id: string; startsAt: Date; endsAt: Date },
  productName: string,
  modalities: string[],
): string {
  const timeStr = session.startsAt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const endTimeStr = session.endsAt.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const lines = [
    `${timeStr} – ${endTimeStr} IST`,
    modalities.length > 0 ? `Modalities: ${modalities.join(", ")}` : null,
    `Join via app: ${APP_URL}/app/join/${session.id}`,
  ].filter(Boolean);
  return lines.join("\n");
}
