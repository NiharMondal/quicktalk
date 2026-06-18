"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/sidebar/Sidebar";
import Loader from "@/components/shared/Loader";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps): React.ReactElement {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Client-side auth guard (auth is Bearer-token in localStorage, so the server
  // can't gate these routes). Once hydration settles, bounce anonymous users.
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // While hydrating, or while redirecting an unauthenticated user, show a loader
  // rather than flashing the authenticated shell.
  if (isLoading || !user) {
    return <Loader size="lg" className="h-screen" label="Loading" />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
