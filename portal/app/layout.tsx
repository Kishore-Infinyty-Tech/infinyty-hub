import type { Metadata, Viewport } from "next";
import { Geist, Sora } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { ToastProvider } from "@/components/ui";
import { IntroProvider } from "@/components/fx/Intro";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Infinyty Hub",
  description: "Company news, celebrations and every internal tool in one place.",
};

export const viewport: Viewport = { themeColor: "#1558e0" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geist.variable} ${sora.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider>
          <ToastProvider>
            <IntroProvider>{children}</IntroProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
