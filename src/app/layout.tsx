import type { Metadata } from "next";
import "../index.css";
import { QueryProvider } from "@/components/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Schema Pad – Visual database schema designer",
  description:
    "Schema Pad: design database schemas on a canvas, export SQL, and use AI with full schema context.",
  icons: {
    icon: "/Icon.png",
    shortcut: "/Icon.png",
    apple: "/Icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full font-manrope-local" suppressHydrationWarning>
      <body className="h-full font-sans antialiased bg-background text-foreground" suppressHydrationWarning>
        <QueryProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
