import { prisma } from "@ru/db";
import { isBlankPhone } from "./user-phone";
import { leadPhoneVariants } from "./leads";

export async function findConflictingPhoneUserId(
  phone: string,
  exceptUserId?: string,
): Promise<string | null> {
  const variants = [
    ...new Set(
      leadPhoneVariants(phone).filter((value) => !isBlankPhone(value)),
    ),
  ];
  if (variants.length === 0) return null;

  const row = await prisma.user.findFirst({
    where: {
      ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
      phone: { in: variants },
    },
    select: { id: true },
  });
  return row?.id ?? null;
}
