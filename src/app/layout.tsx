import type { Metadata } from "next";
import "./globals.css";
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
    <html lang="th">
      <body className="bg-background text-foreground min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
