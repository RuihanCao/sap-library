import "./globals.css";

export const metadata = {
  title: "SAP Replay Explorer",
  description: "Ingest and search Super Auto Pets replays",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" }
    ],
    apple: "/favicon.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
