import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "DeasFinance", description: "Seu banco digital" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}<div id="toast-root"></div></body></html>;
}
