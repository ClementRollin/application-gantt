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

// Fonction utilitaire pour formater une date en chaîne
const formatDate = (date: Date): string => {
  const pad = (n: number) => (n < 10 ? '0' + n : n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// Fonction qui convertit une valeur en chaîne de date (si c'est un objet Date)
const convertToStringDate = (d: any): string => {
  if (d instanceof Date) {
    return formatDate(d);
  } else if (typeof d === "string") {
    return d;
  }
  return "";
};

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
      const parsed = JSON.parse(storedTasks).map((t: any) => ({
        ...t,
        start_date: convertToStringDate(t.start_date)
      }));
      setTasks(parsed);
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
    const formattedDate = formatDate(newStartDate);
    console.log("Nouvelle tâche, date formatée :", formattedDate);

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskName,
      start_date: formattedDate,
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

  // Callback pour mettre à jour une tâche depuis le Gantt
  const handleTaskUpdate = (updatedTask: any) => {
    // Convertir systématiquement start_date en chaîne si nécessaire
    if (updatedTask.start_date) {
      updatedTask.start_date = convertToStringDate(updatedTask.start_date);
    }
    setTasks(prevTasks =>
        prevTasks.map(task =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        )
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const tasksData = {
    data: tasks,
    links: [],
  };

  return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        {/* Header */}
        <header className="bg-primary text-white py-3 shadow">
          <div className="container">
            <h1 className="display-4">Mon Application de Gantt</h1>
            <p className="lead">Organisez et suivez vos projets en toute simplicité</p>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="container flex-grow-1 py-4">
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Ajouter une tâche
            </button>
          </div>

          {/* Liste des tâches */}
          <section className="card mb-4">
            <div className="card-body">
              <h2 className="card-title">Liste des Tâches</h2>
              {tasks.length === 0 ? (
                  <p>Aucune tâche à afficher.</p>
              ) : (
                  <ul className="list-group">
                    {tasks.map(task => (
                        <li key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                          <div>
                            <h5 className="mb-1">{task.text}</h5>
                            <small>
                              Début : {convertToStringDate(task.start_date)} | Durée : {task.duration} jour(s) | Progression : {Math.round(task.progress * 100)}%
                            </small>
                          </div>
                          <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Supprimer la tâche"
                          >
                            &times;
                          </button>
                        </li>
                    ))}
                  </ul>
              )}
            </div>
          </section>

          <section className="card mb-4">
            <div className="card-body">
              <h2 className="card-title">Diagramme de Gantt</h2>
              {tasks.length === 0 ? (
                  <p>Aucune tâche ajoutée. Cliquez sur "Ajouter une tâche" pour démarrer.</p>
              ) : (
                  <GanttChart tasksData={tasksData} onTaskUpdate={handleTaskUpdate} />
              )}
            </div>
          </section>
        </main>

        {/* Footer collé en bas */}
        <footer className="bg-dark text-white py-3">
          <div className="container text-center">
            <p className="mb-0">&copy; {new Date().getFullYear()} Mon Application de Gantt. Tous droits réservés.</p>
          </div>
        </footer>

        {/* Modal et overlay pour désactiver la page */}
        {isModalOpen && (
            <>
              <div className="fullpage-overlay" onClick={() => setIsModalOpen(false)}></div>
              <div className="modal show fade d-block" tabIndex={-1} role="dialog">
                <div className="modal-dialog" role="document">
                  <div className="modal-content">
                    <div className="modal-header d-flex justify-content-between">
                      <h5 className="modal-title">Ajouter une tâche</h5>
                      <button type="button" className="close" onClick={() => setIsModalOpen(false)} aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                    <form onSubmit={handleAddTask}>
                      <div className="modal-body">
                        <div className="form-group mb-3">
                          <label>Nom de la tâche</label>
                          <input
                              type="text"
                              className="form-control"
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              placeholder="Ex: Conception UI"
                          />
                        </div>
                        <div className="form-group d-flex flex-column mb-3">
                          <label>Date de début</label>
                          <DatePicker
                              selected={newStartDate}
                              onChange={(date: Date | null) => setNewStartDate(date)}
                              showTimeSelect
                              timeFormat="HH:mm"
                              timeIntervals={15}
                              dateFormat="yyyy-MM-dd HH:mm"
                              placeholderText="Sélectionnez une date"
                              className="form-control"
                          />
                        </div>
                        <div className="form-row mb-3">
                          <div className="form-group col-md-6 mb-3">
                            <label>Durée (en jours)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={newDuration}
                                onChange={(e) => setNewDuration(Number(e.target.value))}
                                min="1"
                            />
                          </div>
                          <div className="form-group col-md-6">
                            <label>Progression (0 à 1)</label>
                            <input
                                type="number"
                                className="form-control"
                                value={newProgress}
                                onChange={(e) => setNewProgress(Number(e.target.value))}
                                min="0"
                                max="1"
                                step="0.1"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                          Annuler
                        </button>
                        <button type="submit" className="btn btn-primary">
                          Valider
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </>
        )}
      </div>
  );
}