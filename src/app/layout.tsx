import "./globals.css";

export const metadata = {
  title: "FrugalFetishes",
  description: "Next.js rewrite (staging)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
