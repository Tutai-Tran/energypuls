import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EnergyPuls — Dutch day-ahead electricity",
  description:
    "When tomorrow's Dutch electricity is cheap or expensive. Shift heavy loads, charge batteries, and export solar at the right hour.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
