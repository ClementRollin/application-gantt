import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import { supabase } from "@/lib/supabaseClient";

export async function GET(
    request: NextRequest,
    { params }: any
): Promise<Response> {
    const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
    const groupIdNumber = Number(groupId);
    if (isNaN(groupIdNumber)) {
        return NextResponse.json({ error: "Paramètre groupId invalide" }, { status: 400 });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const userGroupId = Number((session.user as any).groupId);
        if (userGroupId !== groupIdNumber) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const { data, error } = await supabase
            .from("gantt")
            .select("*")
            .eq("group_id", groupIdNumber)
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const safeTasks = Array.isArray(data?.tasks) ? data.tasks : [];
        const safeLinks = Array.isArray(data?.links) ? data.links : [];

        return NextResponse.json({ tasks: safeTasks, links: safeLinks });
    } catch (err: any) {
        console.error("GET error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: any
): Promise<Response> {
    const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
    const groupIdNumber = Number(groupId);
    if (isNaN(groupIdNumber)) {
        return NextResponse.json({ error: "Paramètre groupId invalide" }, { status: 400 });
    }

    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        }

        const userGroupId = Number((session.user as any).groupId);
        if (userGroupId !== groupIdNumber) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const json = await request.json();
        const { tasks, links } = json;

        const { data, error } = await supabase
            .from("gantt")
            .upsert(
                {
                    group_id: groupIdNumber,
                    tasks: Array.isArray(tasks) ? tasks : [],
                    links: Array.isArray(links) ? links : [],
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