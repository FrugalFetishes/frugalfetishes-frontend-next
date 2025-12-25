"use client";

import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader = pathname === "/login";

  return (
    <html lang="en">
      <body>
        <div className="ff-app">
          {!hideHeader && (
            <header className="ff-header">
              <div className="ff-header-inner">
                <div className="ff-brand" aria-label="FrugalFetishes">
                  <img src="/FFmenuheaderlogo.png" alt="FrugalFetishes" />
                </div>

                <nav className="ff-nav" aria-label="Primary navigation">
                  <Link className="ff-link" href="/discover">
                    Discover
                  </Link>
                  <Link className="ff-link" href="/matches">
                    Matches
                  </Link>
                  <Link className="ff-link" href="/login">
                    Log out
                  </Link>
                </nav>
              </div>
            </header>
          )}

          {children}
        </div>
      </body>
    </html>
  );
}
