"use client";

import { AuthProvider } from "@/components/providers/AuthProvider";
import { FeedProvider } from "@/components/providers/FeedProvider";
import { BottomNav } from "@/components/ui/BottomNav";
import { ToastContainer } from "@/components/ui/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FeedProvider>
        <div className="w-full max-w-[480px] md:max-w-none mx-auto min-h-screen pb-16 md:pb-0">
          <main className="px-4 py-3">{children}</main>
          <BottomNav />
        </div>
        <ToastContainer />
      </FeedProvider>
    </AuthProvider>
  );
}
