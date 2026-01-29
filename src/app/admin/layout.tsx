import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { syncUser } from '@/lib/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect('/sign-in');

  const user = await syncUser();
  if (user?.role !== 'ADMIN') redirect('/');

  return <>{children}</>;
}
