import { prisma } from "@ru/db";
import { leadPhoneVariants } from "./leads";

export async function findUserForInboundPhone(rawPhone: string) {
  const variants = leadPhoneVariants(rawPhone);
  if (variants.length === 0) return null;

  return prisma.user.findFirst({
    where: { phone: { in: variants } },
    include: {
      memberships: { where: { status: "ACTIVE" }, take: 1 },
    },
  });
}

export function inboundPhoneLogTargets(rawPhone: string): string[] {
  const targets = new Set<string>();
  for (const v of leadPhoneVariants(rawPhone)) {
    targets.add(v);
    const digits = v.replace(/\D/g, "");
    if (digits) targets.add(digits);
  }
  return [...targets];
}

export async function hasPrePaymentWhatsAppBeenSent(
  rawPhone: string,
): Promise<boolean> {
  const toVariants = inboundPhoneLogTargets(rawPhone);
  if (toVariants.length === 0) return false;

  const row = await prisma.messageLog.findFirst({
    where: {
      channel: "WHATSAPP",
      to: { in: toVariants },
      OR: [
        { body: "mukhamudra_cold_inquiry" },
        { body: "mm_pre_payment_info", status: { in: ["SENT", "DELIVERED"] } },
      ],
    },
    select: { id: true },
  });
  return !!row;
}
