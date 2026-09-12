import "./globals.css";
import "../src/app.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZootechX — Offshore Engineering & CRM Platform",
  description: "Internal CRM & Business Management Platform for ZootechX Technologies Pvt. Ltd.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          type="image/svg+xml"
          href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='26' fill='%23000000' stroke='%2338bdf8' stroke-width='4'/%3E%3Cpath d='M27 30 L73 30 L73 38 L41 38 Z' fill='%23ffffff'/%3E%3Cpath d='M69 36 L75 42 L35 74 L27 74 L62 43 Z' fill='%23ffffff'/%3E%3Cpath d='M27 64 L59 64 L73 74 L27 74 Z' fill='%23ffffff'/%3E%3Cpath d='M33 34 L43 28 L69 66 L59 72 Z' fill='%2338bdf8'/%3E%3C/svg%3E"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('zootechx_theme');
                if (saved === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased text-slate-900 dark:text-slate-100 bg-[#f8fafc] dark:bg-[#090d16]">{children}</body>
    </html>
  );
}