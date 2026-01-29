import { currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function syncUser() {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.emailAddresses[0]?.emailAddress ?? '';

  const role =
    clerkUser.publicMetadata.role === 'admin'
      ? 'ADMIN'
      : 'CUSTOMER';

  return prisma.user.upsert({
    where: { clerkUserId: clerkUser.id },
    update: { role },
    create: {
      clerkUserId: clerkUser.id,
      email,
      role,
    },
  });
}
