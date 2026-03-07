import "./globals.css";
import { BackgroundGuard } from "@/app/components/background-guard";

export const metadata = {
  title: "Sap Library",
  description: "Ingest and search Super Auto Pets replays",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" }
    ],
    apple: "/favicon.png"
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <BackgroundGuard />
        {children}
      </body>
    </html>
  );
}
