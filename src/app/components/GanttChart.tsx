"use client";
import React, { useEffect, useRef } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';

type GanttChartProps = {
    tasksData: any;
};

const GanttChart: React.FC<GanttChartProps> = ({ tasksData }) => {
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

export default GanttChart;