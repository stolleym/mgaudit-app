import "./globals.css";

export const metadata = {
  title: "Monthly Audit",
  description: "Simple audit app (no splash, no shadcn)"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
      </body>
    </html>
  );
}
