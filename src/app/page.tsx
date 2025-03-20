"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect, FormEvent } from 'react';

// Import dynamique du composant Gantt (uniquement côté client)
const GanttChart = dynamic(() => import('./components/GanttChartComponent'), {
  ssr: false,
});

// Définition de l'interface d'une tâche
interface Task {
  id: string;
  text: string;
  start_date: string; // Format "YYYY-MM-DD HH:mm"
  duration: number;
  progress: number;
  open: boolean;
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [duration, setDuration] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);

  // Ajout d'une tâche via le formulaire
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!taskName || !startDate || !duration) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    const newTask: Task = {
      id: Date.now().toString(),
      text: taskName,
      start_date: startDate, // Format attendu : "YYYY-MM-DD HH:mm"
      duration,
      progress,
      open: true,
    };
    setTasks((prevTasks) => [...prevTasks, newTask]);
    // Réinitialiser les champs
    setTaskName('');
    setStartDate('');
    setDuration(1);
    setProgress(0);
  };

  const tasksData = {
    data: tasks,
    links: [],
  };

  return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Application de Gantt</h1>

        {/* Formulaire d'ajout de tâche */}
        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <div>
            <label className="block font-medium">Nom de la tâche :</label>
            <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block font-medium">Date de début (YYYY-MM-DD HH:mm) :</label>
            <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="2025-03-20 08:00"
                className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block font-medium">Durée (en jours) :</label>
            <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                min="1"
                className="border p-2 rounded w-full"
            />
          </div>
          <div>
            <label className="block font-medium">Progression (entre 0 et 1) :</label>
            <input
                type="number"
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                min="0"
                max="1"
                step="0.1"
                className="border p-2 rounded w-full"
            />
          </div>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Ajouter la tâche
          </button>
        </form>

        {/* Affichage du Gantt */}
        <GanttChart tasksData={tasksData} />
      </div>
  );
}