import type { Metadata } from "next";
import "./globals.css";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
export const metadata: Metadata = {
  title: "KLANG Management",
  description: "ระบบจัดการคลัง Clan & Gang",
  icons: {
    icon: { url: "/klang-icon.png", type: "image/png", sizes: "1254x1254" },
    apple: { url: "/klang-icon.png", type: "image/png", sizes: "1254x1254" },
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html id="app_html" lang="th" suppressHydrationWarning>
      <head>
        <script
          id="theme_init"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('klang-theme');document.documentElement.dataset.theme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})();`,
          }}
        />
      </head>
      <body
        id="app_body"
        className="bg-background text-foreground min-h-screen antialiased"
      >
        {children}
        <ThemeSwitcher />
      </body>
    </html>
  );
}
