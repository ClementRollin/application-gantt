"use client";
import dynamic from "next/dynamic";
import React, { useState, useEffect, FormEvent, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const GanttChart = dynamic(() => import("./components/GanttChartComponent"), {
  ssr: false,
});

const specialtyOptions = ["UI/UX", "Dev front", "Dev back", "Marketing", "DA", "tout le groupe"];

// Interface d'une tâche
interface Task {
  id: string;
  text: string;
  specialty: string[];
  start_date: string;
  end_date: string;
  duration: number;
  progress: number;
  open: boolean;
}

// Interface d'un lien (dépendance) enrichi d'un écart initial en millisecondes
interface Link {
  id: string;
  source: string;
  target: string;
  type: "0" | "1" | "2" | "3"; // 0: Finish-to-Start, 1: Start-to-Start, 2: Finish-to-Finish, 3: Start-to-Finish
  initialGap?: number; // gap en ms
}

const formatDateTime = (date: Date): string => {
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

const formatDateOnly = (dateInput: any): string => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // États pour création d'une tâche
  const [newTaskName, setNewTaskName] = useState<string>("");
  const [newSpecialty, setNewSpecialty] = useState<string[]>(["UI/UX"]);
  const [newStartDate, setNewStartDate] = useState<Date | null>(null);
  const [newEndDate, setNewEndDate] = useState<Date | null>(null);
  const [newProgress, setNewProgress] = useState<number>(0);

  // États pour modification d'une tâche
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskName, setEditTaskName] = useState<string>("");
  const [editSpecialty, setEditSpecialty] = useState<string[]>([]);
  const [editStartDate, setEditStartDate] = useState<Date | null>(null);
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);
  const [editProgress, setEditProgress] = useState<number>(0);

  // Références pour éviter les doubles mises à jour
  const confirmedTaskRef = useRef<string | null>(null);
  const isUpdatingRef = useRef<boolean>(false);
  const skipNextGanttUpdateRef = useRef<boolean>(false);

  // Chargement initial depuis localStorage
  useEffect(() => {
    const storedData = localStorage.getItem("ganttData");
    if (storedData) {
      const { tasks: storedTasks, links: storedLinks } = JSON.parse(storedData);
      const parsedTasks = storedTasks.map((t: any) => ({
        ...t,
        start_date: formatDateTime(new Date(t.start_date)),
        end_date: formatDateTime(new Date(t.end_date)),
      }));
      setTasks(parsedTasks);
      setLinks(storedLinks || []);
    }
  }, []);

  // Sauvegarde dans localStorage dès que tasks ou links changent
  useEffect(() => {
    localStorage.setItem("ganttData", JSON.stringify({ tasks, links }));
  }, [tasks, links]);

  // Lors d'un changement de lien, on enrichit chaque lien avec son écart initial si ce n'est pas déjà fait
  const enrichLinksWithGap = (linksArray: Link[]): Link[] => {
    return linksArray.map(link => {
      if (link.initialGap !== undefined) return link;
      const predTask = tasks.find(t => t.id === link.source);
      const depTask = tasks.find(t => t.id === link.target);
      if (!predTask || !depTask) return link;
      const predStart = new Date(predTask.start_date);
      const predEnd = new Date(predTask.end_date);
      const depStart = new Date(depTask.start_date);
      const depEnd = new Date(depTask.end_date);
      let gap: number = 0;
      switch(link.type) {
        case "0":
          gap = depStart.getTime() - predEnd.getTime();
          break;
        case "1":
          gap = depStart.getTime() - predStart.getTime();
          break;
        case "2":
          gap = depEnd.getTime() - predEnd.getTime();
          break;
        case "3":
          gap = depEnd.getTime() - predStart.getTime();
          break;
        default:
          gap = 0;
      }
      return { ...link, initialGap: gap };
    });
  };

  const handleAddTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskName || !newStartDate || !newEndDate) {
      alert("Veuillez remplir tous les champs, y compris la date et l'heure de fin.");
      return;
    }
    if (newEndDate <= newStartDate) {
      alert("La date de fin doit être postérieure à la date de début.");
      return;
    }
    const startDateTime = formatDateTime(newStartDate);
    const endDateTime = formatDateTime(newEndDate);
    const computedDuration = (newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60);

    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskName,
      specialty: newSpecialty,
      start_date: startDateTime,
      end_date: endDateTime,
      duration: computedDuration,
      progress: newProgress,
      open: true,
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskName("");
    setNewSpecialty(["UI/UX"]);
    setNewStartDate(null);
    setNewEndDate(null);
    setNewProgress(0);
    setIsModalOpen(false);
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
    setLinks(prev => prev.filter(link => link.source !== id && link.target !== id));
  };

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setEditTaskName(task.text);
    setEditSpecialty(task.specialty);
    setEditStartDate(new Date(task.start_date));
    setEditEndDate(new Date(task.end_date));
    setEditProgress(task.progress);
  };

  // Propagation des changements en utilisant le gap initial stocké dans le lien
  const propagateChanges = (existingTask: Task, updatedTask: Task) => {
    const newPredStart = new Date(updatedTask.start_date);
    const newPredEnd = new Date(updatedTask.end_date);

    setTasks(prev =>
        prev.map(task => {
          const link = links.find(l => l.target === task.id && l.source === existingTask.id);
          if (link) {
            const oldDepStart = new Date(task.start_date);
            const oldDepEnd = new Date(task.end_date);
            const durationMs = oldDepEnd.getTime() - oldDepStart.getTime();
            let newDepStart: Date;
            let newDepEnd: Date;
            let gap: number;
            switch (link.type) {
              case "0": {
                gap = link.initialGap !== undefined
                    ? link.initialGap
                    : oldDepStart.getTime() - new Date(existingTask.end_date).getTime();
                newDepStart = new Date(newPredEnd.getTime() + gap);
                newDepEnd = new Date(newDepStart.getTime() + durationMs);
                break;
              }
              case "1": {
                gap = link.initialGap !== undefined
                    ? link.initialGap
                    : oldDepStart.getTime() - new Date(existingTask.start_date).getTime();
                newDepStart = new Date(newPredStart.getTime() + gap);
                newDepEnd = new Date(newDepStart.getTime() + durationMs);
                break;
              }
              case "2": {
                gap = link.initialGap !== undefined
                    ? link.initialGap
                    : oldDepEnd.getTime() - new Date(existingTask.end_date).getTime();
                newDepEnd = new Date(newPredEnd.getTime() + gap);
                newDepStart = new Date(newDepEnd.getTime() - durationMs);
                break;
              }
              case "3": {
                gap = link.initialGap !== undefined
                    ? link.initialGap
                    : oldDepEnd.getTime() - new Date(existingTask.start_date).getTime();
                newDepEnd = new Date(newPredStart.getTime() + gap);
                newDepStart = new Date(newDepEnd.getTime() - durationMs);
                break;
              }
              default:
                return task;
            }
            return {
              ...task,
              start_date: formatDateTime(newDepStart),
              end_date: formatDateTime(newDepEnd),
              duration: durationMs / (1000 * 60 * 60),
            };
          }
          return task;
        })
    );
  };

  const handleEditTask = (e: FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editStartDate || !editEndDate) {
      alert("Veuillez remplir tous les champs, y compris la date et l'heure de fin.");
      return;
    }
    if (editEndDate <= editStartDate) {
      alert("La date de fin doit être postérieure à la date de début.");
      return;
    }
    isUpdatingRef.current = true;

    const startDateTime = formatDateTime(editStartDate);
    const endDateTime = formatDateTime(editEndDate);
    const computedDuration = (editEndDate.getTime() - editStartDate.getTime()) / (1000 * 60 * 60);

    const updatedTask: Task = {
      ...editingTask,
      text: editTaskName,
      specialty: editSpecialty,
      start_date: startDateTime,
      end_date: endDateTime,
      duration: computedDuration,
      progress: editProgress,
    };

    const existingTask = editingTask;
    const dependentLinks = links.filter(link => link.source === existingTask.id);

    if (
        (updatedTask.start_date !== existingTask.start_date ||
            updatedTask.end_date !== existingTask.end_date) &&
        dependentLinks.length > 0
    ) {
      propagateChanges(existingTask, updatedTask);
    }
    setTasks(prev =>
        prev.map(task =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        )
    );
    skipNextGanttUpdateRef.current = true;
    setEditingTask(null);
    isUpdatingRef.current = false;
  };

  const handleGanttTaskUpdate = (updatedTask: any) => {
    if (skipNextGanttUpdateRef.current) {
      skipNextGanttUpdateRef.current = false;
      return;
    }
    if (isUpdatingRef.current) return;
    const existingTask = tasks.find(task => task.id === updatedTask.id);
    if (!existingTask) return;
    const dependentLinks = links.filter(link => link.source === updatedTask.id);
    if (
        (updatedTask.start_date !== existingTask.start_date ||
            updatedTask.end_date !== existingTask.end_date) &&
        dependentLinks.length > 0
    ) {
      const newPredStart = new Date(updatedTask.start_date);
      const newPredEnd = new Date(updatedTask.end_date);
      setTasks(prev =>
          prev.map(task => {
            const link = dependentLinks.find(l => l.target === task.id);
            if (link) {
              const oldDepStart = new Date(task.start_date);
              const oldDepEnd = new Date(task.end_date);
              const durationMs = oldDepEnd.getTime() - oldDepStart.getTime();
              let newDepStart: Date;
              let newDepEnd: Date;
              let gap: number;
              switch (link.type) {
                case "0": {
                  gap = link.initialGap !== undefined
                      ? link.initialGap
                      : oldDepStart.getTime() - new Date(existingTask.end_date).getTime();
                  newDepStart = new Date(newPredEnd.getTime() + gap);
                  newDepEnd = new Date(newDepStart.getTime() + durationMs);
                  break;
                }
                case "1": {
                  gap = link.initialGap !== undefined
                      ? link.initialGap
                      : oldDepStart.getTime() - new Date(existingTask.start_date).getTime();
                  newDepStart = new Date(newPredStart.getTime() + gap);
                  newDepEnd = new Date(newDepStart.getTime() + durationMs);
                  break;
                }
                case "2": {
                  gap = link.initialGap !== undefined
                      ? link.initialGap
                      : oldDepEnd.getTime() - new Date(existingTask.end_date).getTime();
                  newDepEnd = new Date(newPredEnd.getTime() + gap);
                  newDepStart = new Date(newDepEnd.getTime() - durationMs);
                  break;
                }
                case "3": {
                  gap = link.initialGap !== undefined
                      ? link.initialGap
                      : oldDepEnd.getTime() - new Date(existingTask.start_date).getTime();
                  newDepEnd = new Date(newPredStart.getTime() + gap);
                  newDepStart = new Date(newDepEnd.getTime() - durationMs);
                  break;
                }
                default:
                  return task;
              }
              return {
                ...task,
                start_date: formatDateTime(newDepStart),
                end_date: formatDateTime(newDepEnd),
                duration: durationMs / (1000 * 60 * 60),
              };
            }
            return task;
          })
      );
    }
    setTasks(prev =>
        prev.map(task =>
            task.id === updatedTask.id ? { ...task, ...updatedTask } : task
        )
    );
  };

  const sortedTasks = [...tasks].sort(
      (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );

  const tasksData = { data: sortedTasks, links: links };

  const handleSpecialtyChange = (value: string, checked: boolean, isEdit = false) => {
    if (isEdit) {
      if (checked) {
        setEditSpecialty(prev => [...prev, value]);
      } else {
        setEditSpecialty(prev => prev.filter(s => s !== value));
      }
    } else {
      if (checked) {
        setNewSpecialty(prev => [...prev, value]);
      } else {
        setNewSpecialty(prev => prev.filter(s => s !== value));
      }
    }
  };

  return (
      <div className="d-flex flex-column min-vh-100 bg-light">
        <header className="bg-primary text-white py-3 shadow">
          <div className="container">
            <h1 className="display-4">Mon Application de Gantt</h1>
            <p className="lead">Organisez et suivez vos projets en toute simplicité</p>
          </div>
        </header>

        <main className="container flex-grow-1 py-4">
          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Ajouter une tâche
            </button>
          </div>

          <section className="card mb-4">
            <div className="card-body">
              <h2 className="card-title">Liste des tâches</h2>
              {sortedTasks.length === 0 ? (
                  <p>Aucune tâche à afficher.</p>
              ) : (
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    <ul className="list-group">
                      {sortedTasks.map(task => (
                          <li key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                              <h5 className="mb-1">{task.text}</h5>
                              <small>
                                Spécialités : {task.specialty.join(", ")} | Début : {formatDateOnly(task.start_date)}{" "}
                                {new Date(task.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | Fin :{" "}
                                {formatDateOnly(task.end_date)}{" "}
                                {new Date(task.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | Durée :{" "}
                                {((new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60)).toFixed(2)}{" "}
                                heure(s) | Progression : {Math.round(task.progress * 100)}%
                              </small>
                            </div>
                            <div>
                              <button className="btn btn-secondary btn-sm me-2" onClick={() => handleEditClick(task)}>
                                Modifier
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteTask(task.id)} title="Supprimer la tâche">
                                &times;
                              </button>
                            </div>
                          </li>
                      ))}
                    </ul>
                  </div>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card-body">
              <h2 className="card-title">Diagramme de Gantt</h2>
              {sortedTasks.length === 0 ? (
                  <p>Aucune tâche ajoutée. Cliquez sur "Ajouter une tâche" pour démarrer.</p>
              ) : (
                  <GanttChart
                      tasksData={tasksData}
                      onTaskUpdate={handleGanttTaskUpdate}
                      onLinkChange={(newLinks) => setLinks(enrichLinksWithGap(newLinks))}
                  />
              )}
            </div>
          </section>
        </main>

        <footer className="bg-dark text-white py-3">
          <div className="container text-center">
            <p className="mb-0">&copy; {new Date().getFullYear()} Mon Application de Gantt. Tous droits réservés.</p>
          </div>
        </footer>

        {isModalOpen && (
            <>
              <div className="fullpage-overlay" onClick={() => setIsModalOpen(false)}></div>
              <div className="modal show fade d-block" tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-dialog-centered" role="document">
                  <div className="modal-content">
                    <div className="modal-header d-flex justify-content-between align-items-center">
                      <h5 className="modal-title">Ajouter une tâche</h5>
                      <button type="button" className="close" onClick={() => setIsModalOpen(false)} aria-label="Fermer">
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
                              placeholder="Ex : Conception UI"
                          />
                        </div>
                        <div className="form-group mb-3">
                          <label>Spécialités</label>
                          <div className="d-flex flex-wrap">
                            {specialtyOptions.map(option => (
                                <div key={option} className="form-check me-3">
                                  <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`specialty-${option}`}
                                      value={option}
                                      checked={newSpecialty.includes(option)}
                                      onChange={(e) => handleSpecialtyChange(option, e.target.checked)}
                                  />
                                  <label className="form-check-label" htmlFor={`specialty-${option}`}>
                                    {option}
                                  </label>
                                </div>
                            ))}
                          </div>
                        </div>
                        <div className="form-group mb-3 d-flex flex-column">
                          <label>Date et heure de début</label>
                          <DatePicker
                              selected={newStartDate}
                              onChange={(date: Date | null) => setNewStartDate(date)}
                              showTimeSelect
                              timeFormat="HH:mm"
                              timeIntervals={15}
                              timeCaption="Heure"
                              dateFormat="yyyy-MM-dd HH:mm"
                              placeholderText="Sélectionnez la date et l'heure de début"
                              className="form-control"
                          />
                        </div>
                        <div className="form-group mb-3 d-flex flex-column">
                          <label>Date et heure de fin</label>
                          <DatePicker
                              selected={newEndDate}
                              onChange={(date: Date | null) => setNewEndDate(date)}
                              showTimeSelect
                              timeFormat="HH:mm"
                              timeIntervals={15}
                              timeCaption="Heure"
                              dateFormat="yyyy-MM-dd HH:mm"
                              placeholderText="Sélectionnez la date et l'heure de fin"
                              className="form-control"
                          />
                        </div>
                        <div className="form-group mb-3">
                          <label>Progression (entre 0 et 1)</label>
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

        {editingTask && (
            <>
              <div className="fullpage-overlay" onClick={() => setEditingTask(null)}></div>
              <div className="modal show fade d-block" tabIndex={-1} role="dialog">
                <div className="modal-dialog modal-dialog-centered" role="document">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">Modifier la tâche</h5>
                      <button type="button" className="close" onClick={() => setEditingTask(null)} aria-label="Fermer">
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                    <form onSubmit={handleEditTask}>
                      <div className="modal-body">
                        <div className="form-group mb-3">
                          <label>Nom de la tâche</label>
                          <input
                              type="text"
                              className="form-control"
                              value={editTaskName}
                              onChange={(e) => setEditTaskName(e.target.value)}
                              placeholder="Ex : Conception UI"
                          />
                        </div>
                        <div className="form-group mb-3">
                          <label>Spécialités</label>
                          <div className="d-flex flex-wrap">
                            {specialtyOptions.map(option => (
                                <div key={option} className="form-check me-3">
                                  <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`edit-specialty-${option}`}
                                      value={option}
                                      checked={editSpecialty.includes(option)}
                                      onChange={(e) => handleSpecialtyChange(option, e.target.checked, true)}
                                  />
                                  <label className="form-check-label" htmlFor={`edit-specialty-${option}`}>
                                    {option}
                                  </label>
                                </div>
                            ))}
                          </div>
                        </div>
                        <div className="form-group mb-3 d-flex flex-column">
                          <label>Date et heure de début</label>
                          <DatePicker
                              selected={editStartDate}
                              onChange={(date: Date | null) => setEditStartDate(date)}
                              showTimeSelect
                              timeFormat="HH:mm"
                              timeIntervals={15}
                              timeCaption="Heure"
                              dateFormat="yyyy-MM-dd HH:mm"
                              placeholderText="Sélectionnez la date et l'heure de début"
                              className="form-control"
                          />
                        </div>
                        <div className="form-group mb-3 d-flex flex-column">
                          <label>Date et heure de fin</label>
                          <DatePicker
                              selected={editEndDate}
                              onChange={(date: Date | null) => setEditEndDate(date)}
                              showTimeSelect
                              timeFormat="HH:mm"
                              timeIntervals={15}
                              timeCaption="Heure"
                              dateFormat="yyyy-MM-dd HH:mm"
                              placeholderText="Sélectionnez la date et l'heure de fin"
                              className="form-control"
                          />
                        </div>
                        <div className="form-group mb-3">
                          <label>Progression (entre 0 et 1)</label>
                          <input
                              type="number"
                              className="form-control"
                              value={editProgress}
                              onChange={(e) => setEditProgress(Number(e.target.value))}
                              min="0"
                              max="1"
                              step="0.1"
                          />
                        </div>
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setEditingTask(null)}>
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