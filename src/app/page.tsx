"use client";
import React, { useEffect, useState } from 'react';
import GanttChart from './components/GanttChart';

export default function HomePage() {
  const [tasksData, setTasksData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/trello');
      const data = await res.json();
      if (data.data) {
        setTasksData(data);
      }
    } catch (err) {
      console.error("Erreur de récupération :", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="p-4">Chargement du Gantt...</div>;
  }

  return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Mon Diagramme de Gantt avec DHTMLX</h1>
        {tasksData && <GanttChart tasksData={tasksData} />}
      </div>
  );
}