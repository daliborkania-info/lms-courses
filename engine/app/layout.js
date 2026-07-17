import "./globals.css";

export const metadata = {
  title: "Studium | LMS",
  description: "Osobní e-learningový engine",
  manifest: undefined
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b1220"
};

export default function RootLayout({ children }) {
  return (
    <html lang="cs">
      <body>
        <div className="mx-auto max-w-2xl min-h-dvh pb-20">{children}</div>
      </body>
    </html>
  );
}
