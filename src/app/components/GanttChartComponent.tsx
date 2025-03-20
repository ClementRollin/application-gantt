// src/app/components/GanttChartComponent.tsx
"use client";
import React, { useEffect, useRef } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';

export interface GanttChartProps {
    tasksData: {
        data: Array<{
            id: string;
            text: string;
            start_date: string;
            duration: number;
            progress: number;
            open: boolean;
        }>;
        links: Array<any>;
    };
    onTaskUpdate?: (updatedTask: any) => void;
}

const GanttChartComponent: React.FC<GanttChartProps> = ({ tasksData, onTaskUpdate }) => {
    const ganttContainer = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Configure le format de date attendu par Gantt
        (gantt as any).config.date_format = "%Y-%m-%d %H:%i";

        if (ganttContainer.current) {
            gantt.init(ganttContainer.current);
        }

        // Attacher l'événement de mise à jour d'une tâche
        (gantt as any).attachEvent("onAfterTaskUpdate", (id: any, item: any) => {
            if (onTaskUpdate) {
                onTaskUpdate(item);
            }
            return true;
        });

        return () => {
            gantt.clearAll();
        };
    }, []);

    useEffect(() => {
        if (tasksData) {
            gantt.clearAll();
            gantt.parse(tasksData);
        }
    }, [tasksData]);

    return <div ref={ganttContainer} style={{ width: '100%', height: '600px' }} />;
};

export default GanttChartComponent;