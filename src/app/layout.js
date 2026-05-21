import "./globals.css";

export const metadata = {
  title: "GPS-AMS Admin",
  description: "GPS-Based Ankle Monitoring System administration dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
