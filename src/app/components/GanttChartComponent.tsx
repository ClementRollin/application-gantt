"use client";
import React, { useEffect, useRef } from "react";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import gantt from "dhtmlx-gantt";

export interface GanttChartProps {
    tasksData: {
        data: Array<{
            id: string;
            text: string;
            specialty: string[];
            start_date: string;
            end_date: string;
            duration: number;
            progress: number;
            open: boolean;
        }>;
        links: Array<any>;
    };
    onTaskUpdate?: (updatedTask: any) => void;
    onLinkChange?: (newLinks: any[]) => void;
}

const GanttChartComponent: React.FC<GanttChartProps> = ({ tasksData, onTaskUpdate, onLinkChange }) => {
    const ganttContainer = useRef<HTMLDivElement>(null);

    const parseDate = (dateInput: any): Date => {
        return dateInput instanceof Date ? dateInput : new Date(dateInput);
    };

    useEffect(() => {
        const ganttAny = gantt as any;
        ganttAny.config.date_format = "%Y-%m-%dT%H:%i:%s";
        ganttAny.config.xml_date = "%Y-%m-%dT%H:%i:%s";
        ganttAny.config.duration_unit = "hour";
        ganttAny.config.duration_step = 0.1;
        ganttAny.config.round_durations = false;

        ganttAny.config.columns = [
            { name: "text", label: "Nom de la tâche", tree: true, width: 150 },
            {
                name: "specialty",
                label: "Spécialités",
                align: "left",
                width: 150,
                template: function (task: any) {
                    return Array.isArray(task.specialty) ? task.specialty.join(", ") : task.specialty;
                }
            },
            { name: "start_date", label: "Date de début", align: "left", width: 130 },
            {
                name: "duration",
                label: "Durée",
                align: "left",
                width: 80,
                template: function (task: any) {
                    const durationInHours = (task.end_date - task.start_date) / (1000 * 60 * 60);
                    return durationInHours.toFixed(2) + " h";
                }
            }
        ];

        ganttAny.templates.task_class = function (start: any, end: any, task: any) {
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

        ganttAny.attachEvent("onAfterTaskUpdate", (id: any, item: any) => {
            if (onTaskUpdate) {
                onTaskUpdate(item);
            }
            return false;
        });

        ganttAny.attachEvent("onAfterLinkAdd", (id: any, link: any) => {
            if (onLinkChange) {
                const allLinks = ganttAny.getLinks();
                onLinkChange(allLinks);
            }
            return false;
        });
        ganttAny.attachEvent("onAfterLinkDelete", (id: any, link: any) => {
            if (onLinkChange) {
                const allLinks = ganttAny.getLinks();
                onLinkChange(allLinks);
            }
            return false;
        });
        ganttAny.attachEvent("onAfterLinkUpdate", (id: any, link: any) => {
            if (onLinkChange) {
                const allLinks = ganttAny.getLinks();
                onLinkChange(allLinks);
            }
            return false;
        });

        return () => {
            ganttAny.clearAll();
        };
    }, [onTaskUpdate, onLinkChange]);

    useEffect(() => {
        if (tasksData) {
            const transformedData = {
                data: tasksData.data.map(task => ({
                    ...task,
                    start_date: parseDate(task.start_date),
                    end_date: parseDate(task.end_date)
                })),
                links: tasksData.links
            };
            (gantt as any).clearAll();
            (gantt as any).parse(transformedData, "json");
        }
    }, [tasksData]);

    return <div ref={ganttContainer} style={{ width: "100%", height: "600px" }} />;
};

export default GanttChartComponent;