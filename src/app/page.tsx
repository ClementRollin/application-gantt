"use client";
import dynamic from 'next/dynamic';
import React, { useState, useEffect, FormEvent } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

// Importation dynamique du composant Gantt (uniquement côté client)
const GanttChart = dynamic(() => import('./components/GanttChartComponent'), {
  ssr: false,
});

// Interface d'une tâche
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
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Champs du formulaire pour ajouter une tâche
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [newStartDate, setNewStartDate] = useState<Date | null>(null);
  const [newDuration, setNewDuration] = useState<number>(1);
  const [newProgress, setNewProgress] = useState<number>(0);

  // Charger les tâches depuis localStorage au montage
  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      setTasks(JSON.parse(storedTasks));
    }
  }, []);

  // Sauvegarder les tâches dans localStorage à chaque modification
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskName || !newStartDate) {
      alert('Veuillez remplir tous les champs.');
      return;
    }
    // Formatage de la date en "YYYY-MM-DD HH:mm"
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    const formatDate = (date: Date) =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskName,
      start_date: formatDate(newStartDate),
      duration: newDuration,
      progress: newProgress,
      open: true,
    };

    setTasks(prev => [...prev, newTask]);
    // Réinitialiser le formulaire
    setNewTaskName('');
    setNewStartDate(null);
    setNewDuration(1);
    setNewProgress(0);
    setIsModalOpen(false);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const tasksData = {
    data: tasks,
    links: [],
  };

  return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-700 to-blue-500 text-white py-6 shadow-lg">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl font-bold">Mon Application de Gantt</h1>
            <p className="mt-2 text-lg">Organisez et suivez vos projets en toute simplicité</p>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-end mb-6">
            <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full shadow transition duration-200"
            >
              Ajouter une tâche
            </button>
          </div>

          <section className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-semibold mb-6">Diagramme de Gantt</h2>
            {tasks.length === 0 ? (
                <p className="text-gray-600 text-lg">
                  Aucune tâche ajoutée. Cliquez sur "Ajouter une tâche" pour démarrer.
                </p>
            ) : (
                <GanttChart tasksData={tasksData} />
            )}
          </section>

          {/* Liste des tâches avec possibilité de suppression */}
          <section className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-semibold mb-4">Liste des Tâches</h2>
            {tasks.length === 0 ? (
                <p className="text-gray-600">Aucune tâche à afficher.</p>
            ) : (
                <ul className="space-y-4">
                  {tasks.map(task => (
                      <li key={task.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <p className="text-lg font-medium">{task.text}</p>
                          <p className="text-sm text-gray-500">
                            Début : {task.start_date} | Durée : {task.duration} jour(s) | Progression : {task.progress * 100}%
                          </p>
                        </div>
                        <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                            title="Supprimer la tâche"
                        >
                          {/* Icône simple (vous pouvez remplacer par une icône via react-icons par exemple) */}
                          &#128465;
                        </button>
                      </li>
                  ))}
                </ul>
            )}
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 text-white py-4 mt-12">
          <div className="container mx-auto px-4 text-center">
            <p>&copy; {new Date().getFullYear()} Mon Application de Gantt. Tous droits réservés.</p>
          </div>
        </footer>

        {/* Modal pour ajouter une tâche */}
        {isModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50 transition-opacity">
              {/* Overlay */}
              <div
                  className="fixed inset-0 bg-black opacity-60"
                  onClick={() => setIsModalOpen(false)}
              ></div>
              {/* Contenu de la modal */}
              <div className="bg-white rounded-xl shadow-2xl z-50 p-8 w-11/12 max-w-lg transform transition-transform duration-300 scale-100">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Ajouter une tâche</h2>
                <form onSubmit={handleAddTask} className="space-y-5">
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Nom de la tâche
                    </label>
                    <input
                        type="text"
                        value={newTaskName}
                        onChange={(e) => setNewTaskName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex : Conception UI"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-1">
                      Date de début
                    </label>
                    <DatePicker
                        selected={newStartDate}
                        onChange={(date: Date | null) => setNewStartDate(date)}
                        showTimeSelect
                        timeFormat="HH:mm"
                        timeIntervals={15}
                        dateFormat="yyyy-MM-dd HH:mm"
                        placeholderText="Sélectionnez une date"
                        className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">
                        Durée (en jours)
                      </label>
                      <input
                          type="number"
                          value={newDuration}
                          onChange={(e) => setNewDuration(Number(e.target.value))}
                          min="1"
                          className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-medium mb-1">
                        Progression (0 à 1)
                      </label>
                      <input
                          type="number"
                          value={newProgress}
                          onChange={(e) => setNewProgress(Number(e.target.value))}
                          min="0"
                          max="1"
                          step="0.1"
                          className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
                    >
                      Annuler
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200"
                    >
                      Valider
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}
      </div>
  );
}