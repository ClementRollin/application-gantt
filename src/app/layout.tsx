import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Application de Gantt',
    description: 'Ajoutez vos tâches et visualisez un diagramme de Gantt complet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="fr">
        <body>{children}</body>
        </html>
    );
}