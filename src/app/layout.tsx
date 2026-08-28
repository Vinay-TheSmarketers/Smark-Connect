import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL ?? "http://localhost:3000"),
  title: "Smark Connect — Your AI CMO",
  description: "Turn your company website into an always-on AI marketing workspace.",
  openGraph: {
    title: "Smark Connect — Your AI CMO, connected to the work.",
    description: "Connect your company URL, build marketing intelligence, and run growth work from one AI CMO workspace.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Smark Connect AI CMO" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Smark Connect — Your AI CMO, connected to the work.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}<Script id="smark-theme" strategy="beforeInteractive">{`(function(){try{var t=localStorage.getItem('smark-theme');var v=t==='dark'?'dark':'light';document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch(e){document.documentElement.dataset.theme='light'}})();`}</Script></body>
    </html>
  );
}
