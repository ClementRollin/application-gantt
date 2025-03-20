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
            specialty: string;
            start_date: string;
            end_date: string;
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
        const ganttAny = gantt as any;
        // Configuration du format de date attendu par Gantt
        ganttAny.config.date_format = "%Y-%m-%d %H:%i";

        // Configuration des colonnes, incluant la spécialité
        ganttAny.config.columns = [
            { name: "text", label: "Task Name", tree: true, width: '*' },
            { name: "specialty", label: "Spécialité", align: "center", width: 100 },
            { name: "start_date", label: "Start Date", align: "center", width: 100 },
            { name: "duration", label: "Duration", align: "center", width: 60 },
        ];

        // Template pour définir la classe CSS de la tâche en fonction de la progression
        ganttAny.templates.task_class = function(start: any, end: any, task: any) {
            const p = task.progress * 100;
            if (p < 26) {
                return "red-task";
            } else if (p < 51) {
                return "orange-task";
            } else if (p < 75) {
                return "yellow-task";
            } else {
                return "green-task";
            }
        };

        if (ganttContainer.current) {
            ganttAny.init(ganttContainer.current);
        }

        // Attachement de l'événement pour notifier les mises à jour de tâche
        ganttAny.attachEvent("onAfterTaskUpdate", (id: any, item: any) => {
            if (onTaskUpdate) {
                onTaskUpdate(item);
            }
            return true;
        });

        return () => {
            ganttAny.clearAll();
        };
    }, []);

    useEffect(() => {
        if (tasksData) {
            (gantt as any).clearAll();
            (gantt as any).parse(tasksData);
        }
    }, [tasksData]);

    return <div ref={ganttContainer} style={{ width: '100%', height: '600px' }} />;
};

export default GanttChartComponent;