import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FrugalFetishes",
  description: "Dating app prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
