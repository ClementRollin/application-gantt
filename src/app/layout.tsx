import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import { Inter } from "next/font/google";
import { NextAuthProvider } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Gantt App",
    description: "Gantt multi-groupes"
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
    return (
        <html lang="fr">
        <body className={inter.className}>
        <NextAuthProvider>
            {children}
        </NextAuthProvider>
        </body>
        </html>
    );
}