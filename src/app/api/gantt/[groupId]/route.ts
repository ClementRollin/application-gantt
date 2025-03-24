import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: NextRequest, context: { params: { groupId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Conversion en nombre pour correspondre au type int8 de la base
    const userGroupId = Number((session.user as any).groupId);
    const groupIdParam = Number(context.params.groupId);

    if (userGroupId !== groupIdParam) {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { data, error } = await supabase
        .from("gantt")
        .select("*")
        .eq("group_id", groupIdParam)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Assurer que tasks et links soient des tableaux
    const safeTasks = Array.isArray(data?.tasks) ? data.tasks : [];
    const safeLinks = Array.isArray(data?.links) ? data.links : [];

    return NextResponse.json({ tasks: safeTasks, links: safeLinks });
}

export async function PUT(req: NextRequest, context: { params: { groupId: string } }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const userGroupId = Number((session.user as any).groupId);
        const groupIdParam = Number(context.params.groupId);

        if (userGroupId !== groupIdParam) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const json = await req.json();
        const { tasks, links } = json;

        console.log("PUT payload:", tasks, links);

        // Cette opération va fonctionner si "group_id" est unique dans la table "gantt"
        const { data, error } = await supabase
            .from("gantt")
            .upsert(
                {
                    group_id: groupIdParam,
                    tasks: Array.isArray(tasks) ? tasks : [],
                    links: Array.isArray(links) ? links : []
                },
                { onConflict: "group_id" }
            )
            .single();

        if (error) {
            console.error("Supabase upsert error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        console.error("PUT error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}