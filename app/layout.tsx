export const metadata = {
  title: "Monthly Audit",
  description: "Mamas Dining Group – Audit Dashboard",
};

import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0E0E10] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
