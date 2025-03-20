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
}

const GanttChartComponent: React.FC<GanttChartProps> = ({ tasksData }) => {
    const ganttContainer = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ganttContainer.current) {
            gantt.init(ganttContainer.current);
        }
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