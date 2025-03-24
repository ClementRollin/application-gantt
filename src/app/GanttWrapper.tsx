"use client";

import useSWR from "swr";
import React from "react";
import GanttChartComponent from "./components/GanttChartComponent";

interface GanttData {
    tasks: any[];
    links: any[];
}

const fetcher = (url: string) =>
    fetch(url, { credentials: "include" }).then((res) => res.json());

export default function GanttWrapper({ groupId }: { groupId: string }) {
    const { data, error, mutate } = useSWR<GanttData>(`/api/gantt/${groupId}`, fetcher);

    if (error) return <p>Erreur : {JSON.stringify(error)}</p>;
    if (!data) return <p>Chargement des données...</p>;

    // S'assurer que tasks et links sont des tableaux
    const tasksData = {
        data: Array.isArray(data.tasks) ? data.tasks : [],
        links: Array.isArray(data.links) ? data.links : []
    };

    // Mise à jour du Gantt dans la base
    const updateGantt = async (newTasks: any[], newLinks: any[]) => {
        const response = await fetch(`/api/gantt/${groupId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ tasks: newTasks, links: newLinks })
        });
        if (!response.ok) {
            console.error("Erreur lors de la mise à jour du Gantt");
        }
        mutate();
    };

    const handleTaskUpdate = (updatedTask: any) => {
        const newTasks = tasksData.data.map((t: any) =>
            t.id === updatedTask.id ? updatedTask : t
        );
        updateGantt(newTasks, tasksData.links);
    };

    const handleLinkChange = (newLinks: any[]) => {
        updateGantt(tasksData.data, newLinks);
    };

    return (
        <div>
            <GanttChartComponent
                tasksData={tasksData}
                onTaskUpdate={handleTaskUpdate}
                onLinkChange={handleLinkChange}
            />
        </div>
    );
}