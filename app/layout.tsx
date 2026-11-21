import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import Link from "next/link";
import { Toaster } from "@/components/ui/sonner";
import { NOT_ADVICE } from "@/lib/copy";
import { LAST_VERIFIED } from "@/lib/rules/sources";
import { fmtDate } from "@/lib/rules/dates";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], axes: ["opsz"], display: "swap" });
const deva = Noto_Sans_Devanagari({ variable: "--font-deva", subsets: ["devanagari"], weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Haq · Your complaint, routed", template: "%s · Haq" },
  description:
    "Tell Haq what went wrong with your bank, payment app, online shop or insurer. It finds where to complain, by when, and what the law says you're owed, then writes the complaint.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f22" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${deva.variable}`}>
      <body className="flex min-h-dvh flex-col">
        {/* Ink texture for the rubber-stamp marks. */}
        <svg aria-hidden className="absolute size-0">
          <filter id="stamp-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.5" />
            <feComposite in="SourceGraphic" operator="in" />
          </filter>
        </svg>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2">
          Skip to content
        </a>
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="group flex items-baseline gap-2 rounded-md">
            <span className="display text-2xl font-[750] text-primary">Haq</span>
            <span lang="hi" className="text-base text-muted-foreground">हक़</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-0.5 whitespace-nowrap text-[0.9rem]">
            <Link href="/how-it-works" className="inline-flex h-11 items-center rounded-lg px-2 hover:bg-muted sm:px-3">
              How it works
            </Link>
            <Link href="/rules" className="inline-flex h-11 items-center rounded-lg px-2 hover:bg-muted sm:px-3">
              The rules
            </Link>
          </nav>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="mt-24 border-t">
          <div className="mx-auto grid max-w-6xl gap-3 px-4 py-8 text-[0.85rem] text-muted-foreground sm:px-6 md:grid-cols-[1fr_auto]">
            <p className="max-w-prose">
              <strong className="font-semibold text-foreground">{NOT_ADVICE}</strong> Haq never files anything for you. Sample people,
              banks, shops and insurers are fictional.
            </p>
            <p className="md:text-right">
              Rules last verified {fmtDate(LAST_VERIFIED)} ·{" "}
              <Link href="/rules" className="underline underline-offset-4 hover:text-foreground">
                see every rule
              </Link>
            </p>
          </div>
        </footer>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
