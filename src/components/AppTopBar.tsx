'use client';

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearSession } from "@/lib/session";

type NavItem = { href: string; label: string };

export default function AppTopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = useMemo(
    () => [
      { href: "/discover", label: "Discover" },
      { href: "/matches", label: "Matches" },
    ],
    []
  );

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // ESC to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function logout() {
    clearSession();
    router.push("/login");
  }

  return (
    <>
      <header className="topbar">
        <button
          type="button"
          className="iconBtn"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="hamburger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>

        <div className="brandWrap" aria-label="FrugalFetishes">
          <Image
            src="/FFmenuheaderlogo.png"
            alt="FrugalFetishes"
            width={220}
            height={44}
            priority
            className="brandImg"
          />
        </div>

        <button
          type="button"
          className="iconBtn"
          aria-label="Log out"
          onClick={logout}
          title="Log out"
        >
          ⎋
        </button>
      </header>

      {open && (
        <div className="menuOverlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="overlayBackdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="menuPanel">
            <div className="menuHeader">
              <div className="menuTitle">Menu</div>
              <button
                type="button"
                className="iconBtn"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>

            <nav className="menuNav" aria-label="Primary">
              {items.map((it) => {
                const active = pathname?.startsWith(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={active ? "menuLink active" : "menuLink"}
                  >
                    {it.label}
                  </Link>
                );
              })}
            </nav>

            <div className="menuFooter">
              <button type="button" className="pillBtn danger" onClick={logout}>
                Log out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
