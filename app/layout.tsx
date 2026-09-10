import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reframe — Content Intelligence by SEOgirl",
  description: "Research, preserve and improve your best content with a guided editorial workflow.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
