import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma, prisma, UserRole } from "@ru/db";
import { redirect } from "next/navigation";

function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function getCurrentUser() {
  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress || "";
  const baseUserData = {
    clerkId: user.id,
    email,
    name: user.fullName || user.firstName || undefined,
    avatarUrl: user.imageUrl || undefined,
    phone: user.phoneNumbers[0]?.phoneNumber || undefined,
  };

  // Try to find user by Clerk ID first
  let dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
  });

  // If not found by clerkId, try to find by email (for linking seeded users)
  if (!dbUser && email) {
    dbUser = await prisma.user.findUnique({
      where: { email },
    });

    // If we found a user by email, link it to this Clerk account
    if (dbUser) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: {
          clerkId: user.id,
          name: dbUser.name || user.fullName || user.firstName || undefined,
          avatarUrl: user.imageUrl || undefined,
          phone: dbUser.phone || user.phoneNumbers[0]?.phoneNumber || undefined,
        },
      });
    }
  }

  // If still no user found, create a new one
  if (!dbUser) {
    try {
      dbUser = await prisma.user.create({
        data: baseUserData,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      dbUser = await prisma.user.findFirst({
        where: {
          OR: [{ clerkId: user.id }, ...(email ? [{ email }] : [])],
        },
      });

      if (!dbUser) {
        throw error;
      }

      if (!dbUser.clerkId) {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            clerkId: user.id,
            name: dbUser.name || baseUserData.name,
            avatarUrl: baseUserData.avatarUrl,
            phone: dbUser.phone || baseUserData.phone,
          },
        });
      }
    }
  }

  return dbUser;
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/auth/sign-in");
  }
  return getCurrentUser();
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  if (!user || !allowedRoles.includes(user.role)) {
    redirect("/app");
  }
  return user;
}

export async function requireAdmin() {
  return requireRole(["ADMIN"]);
}

export async function requireOps() {
  return requireRole(["ADMIN", "OPS"]);
}

export async function requireCoach() {
  return requireRole(["ADMIN", "OPS", "COACH"]);
}

export function isAdmin(role: UserRole) {
  return role === "ADMIN";
}

export function isOpsOrAbove(role: UserRole) {
  return ["ADMIN", "OPS"].includes(role);
}

export function isCoachOrAbove(role: UserRole) {
  return ["ADMIN", "OPS", "COACH"].includes(role);
}
