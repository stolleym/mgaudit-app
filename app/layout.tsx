export const metadata = {
  title: "Monthly Audit",
  description: "Kitchen audits & deep clean scheduler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0E0E10] text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
