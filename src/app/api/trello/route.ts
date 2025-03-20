import { NextRequest, NextResponse } from 'next/server';

function formatDate(date: Date): string {
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export async function GET(request: NextRequest) {
    const { TRELLO_API_KEY, TRELLO_API_TOKEN, TRELLO_BOARD_ID } = process.env;

    if (!TRELLO_API_KEY || !TRELLO_API_TOKEN || !TRELLO_BOARD_ID) {
        return NextResponse.json(
            { error: 'Les variables d’environnement Trello ne sont pas définies.' },
            { status: 400 }
        );
    }

    const url = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_API_TOKEN}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            return NextResponse.json(
                { error: 'Erreur lors de la récupération des données Trello.' },
                { status: res.status }
            );
        }

        const cards = await res.json();

        // Transformation : on génère pour chaque carte une tâche
        const data = cards
            .filter((card: any) => card && card.id && card.name)
            .map((card: any) => {
                const now = new Date();
                const start_date = now;
                const end_date = card.due ? new Date(card.due) : now;
                // Calculer la durée en jours (minimum 1)
                const duration = card.due
                    ? Math.max(1, Math.ceil((end_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                    : 1;

                return {
                    id: card.id,
                    text: card.name,
                    start_date: formatDate(start_date),
                    duration: duration,
                    progress: 0,
                    open: true,
                };
            });

        return NextResponse.json({ data, links: [] });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}