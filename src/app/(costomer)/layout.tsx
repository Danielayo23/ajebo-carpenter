import CustomerHeader from '@/components/customer-header';
import CustomerFooter from '@/components/customer-footer';
import { syncUser } from '@/lib/auth';

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ensure Clerk user is synced into DB (safe to call repeatedly)
  await syncUser();

  return (
    <div className="flex min-h-screen flex-col">
      <CustomerHeader />

      <main className="flex-1">
        {children}
      </main>

      <CustomerFooter />
    </div>
  );
}
