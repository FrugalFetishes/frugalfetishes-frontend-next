'use client';

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppTopBar from "@/components/AppTopBar";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Hide chrome on login (and any future auth pages)
  const hideChrome =
    pathname === "/login" ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/_error");

  return (
    <div className="appRoot">
      {!hideChrome && <AppTopBar />}
      <main className={hideChrome ? "appMainNoChrome" : "appMain"}>
        {children}
      </main>
    </div>
  );
}
