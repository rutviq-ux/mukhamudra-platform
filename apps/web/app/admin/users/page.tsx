import { prisma } from "@ru/db";
import { UserTable } from "./user-table";

export default async function AdminUsersPage() {
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        clerkId: true,
        marketingOptIn: true,
        whatsappOptIn: true,
        createdAt: true,
        _count: { select: { orders: true, memberships: true, bookings: true } },
      },
    }),
    prisma.user.count(),
  ]);

  return (
    <UserTable
      initialData={{
        users: users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
        })),
        total,
        page: 1,
        limit: 50,
        totalPages: Math.ceil(total / 50),
      }}
    />
  );
}
