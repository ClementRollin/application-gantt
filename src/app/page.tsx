"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, FormEvent, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button, Container, Row, Col } from "react-bootstrap";
import GanttWrapper from "./GanttWrapper";

const GanttChart = dynamic(() => import("./components/GanttChartComponent"), {
    ssr: false
});

const specialtyOptions = ["UI/UX", "Dev front", "Dev back", "Marketing", "DA", "tout le groupe"];

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

interface Link {
    id: string;
    source: string;
    target: string;
    type: "0" | "1" | "2" | "3";
    initialGap?: number;
}

const formatDateTime = (date: Date): string => {
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
        date.getHours()
    )}:${pad(date.getMinutes())}:00`;
};

const formatDateOnly = (dateInput: any): string => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export default function HomePage() {
    const { data: session, status } = useSession();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [links, setLinks] = useState<Link[]>([]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const [newTaskName, setNewTaskName] = useState<string>("");
    const [newSpecialty, setNewSpecialty] = useState<string[]>(["UI/UX"]);
    const [newStartDate, setNewStartDate] = useState<Date | null>(null);
    const [newEndDate, setNewEndDate] = useState<Date | null>(null);
    const [newProgress, setNewProgress] = useState<number>(0);

    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [editTaskName, setEditTaskName] = useState<string>("");
    const [editSpecialty, setEditSpecialty] = useState<string[]>([]);
    const [editStartDate, setEditStartDate] = useState<Date | null>(null);
    const [editEndDate, setEditEndDate] = useState<Date | null>(null);
    const [editProgress, setEditProgress] = useState<number>(0);

    const isUpdatingRef = useRef<boolean>(false);
    const skipNextGanttUpdateRef = useRef<boolean>(false);

    // Chargement initial des données depuis l'API
    useEffect(() => {
        if (session) {
            const userGroupId = (session.user as any).groupId;
            async function loadGanttData() {
                const res = await fetch(`/api/gantt/${userGroupId}`, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    setTasks(Array.isArray(data.tasks) ? data.tasks : []);
                    setLinks(Array.isArray(data.links) ? data.links : []);
                }
            }
            loadGanttData();
        }
    }, [session]);

    // Migration des données stockées en local (si présentes) vers la base
    useEffect(() => {
        if (session) {
            const localDataStr = localStorage.getItem("ganttData");
            if (localDataStr) {
                try {
                    const localData = JSON.parse(localDataStr);
                    if (
                        (localData.tasks && localData.tasks.length > 0) ||
                        (localData.links && localData.links.length > 0)
                    ) {
                        console.log("Migration des données locales vers la base :", localData);
                        updateGantt(localData.tasks, localData.links);
                        localStorage.removeItem("ganttData");
                    }
                } catch (e) {
                    console.error("Erreur lors de l'analyse des données du local storage", e);
                }
            }
        }
    }, [session]);

    // Mise à jour du Gantt dans la base
    async function updateGantt(newTasks: Task[], newLinks: Link[]) {
        if (session) {
            const userGroupId = (session.user as any).groupId;
            const res = await fetch(`/api/gantt/${userGroupId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ tasks: newTasks, links: newLinks })
            });
            if (!res.ok) {
                console.error("Erreur lors de la mise à jour du Gantt");
            }
        }
    }

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
            open: true
        };

        const updatedTasks = [...tasks, newTask];
        setTasks(updatedTasks);
        updateGantt(updatedTasks, links);

        setNewTaskName("");
        setNewSpecialty(["UI/UX"]);
        setNewStartDate(null);
        setNewEndDate(null);
        setNewProgress(0);
        setIsModalOpen(false);
    };

    const handleDeleteTask = (id: string) => {
        const updatedTasks = tasks.filter(task => task.id !== id);
        const updatedLinks = links.filter(link => link.source !== id && link.target !== id);
        setTasks(updatedTasks);
        setLinks(updatedLinks);
        updateGantt(updatedTasks, updatedLinks);
    };

    const handleEditClick = (task: Task) => {
        setEditingTask(task);
        setEditTaskName(task.text);
        setEditSpecialty(task.specialty);
        setEditStartDate(new Date(task.start_date));
        setEditEndDate(new Date(task.end_date));
        setEditProgress(task.progress);
    };

    const propagateChanges = (existingTask: Task, updatedTask: Task) => {
        const newPredStart = new Date(updatedTask.start_date);
        const newPredEnd = new Date(updatedTask.end_date);
        const updatedTasks = tasks.map(task => {
            const link = links.find(l => l.target === task.id && l.source === existingTask.id);
            if (link) {
                const oldDepStart = new Date(task.start_date);
                const oldDepEnd = new Date(task.end_date);
                const durationMs = oldDepEnd.getTime() - oldDepStart.getTime();
                let newDepStart: Date;
                let newDepEnd: Date;
                let gap: number;
                switch (link.type) {
                    case "0":
                        gap = link.initialGap ?? (oldDepStart.getTime() - new Date(existingTask.end_date).getTime());
                        newDepStart = new Date(newPredEnd.getTime() + gap);
                        newDepEnd = new Date(newDepStart.getTime() + durationMs);
                        break;
                    case "1":
                        gap = link.initialGap ?? (oldDepStart.getTime() - new Date(existingTask.start_date).getTime());
                        newDepStart = new Date(newPredStart.getTime() + gap);
                        newDepEnd = new Date(newDepStart.getTime() + durationMs);
                        break;
                    case "2":
                        gap = link.initialGap ?? (oldDepEnd.getTime() - new Date(existingTask.end_date).getTime());
                        newDepEnd = new Date(newPredEnd.getTime() + gap);
                        newDepStart = new Date(newDepEnd.getTime() - durationMs);
                        break;
                    case "3":
                        gap = link.initialGap ?? (oldDepEnd.getTime() - new Date(existingTask.start_date).getTime());
                        newDepEnd = new Date(newPredStart.getTime() + gap);
                        newDepStart = new Date(newDepEnd.getTime() - durationMs);
                        break;
                    default:
                        return task;
                }
                return {
                    ...task,
                    start_date: formatDateTime(newDepStart),
                    end_date: formatDateTime(newDepEnd),
                    duration: durationMs / (1000 * 60 * 60)
                };
            }
            return task;
        });
        setTasks(updatedTasks);
        updateGantt(updatedTasks, links);
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
            progress: editProgress
        };

        const dependentLinks = links.filter(link => link.source === editingTask.id);
        if (
            (updatedTask.start_date !== editingTask.start_date ||
                updatedTask.end_date !== editingTask.end_date) &&
            dependentLinks.length > 0
        ) {
            propagateChanges(editingTask, updatedTask);
        }

        const updatedTasks = tasks.map(task => task.id === updatedTask.id ? { ...task, ...updatedTask } : task);
        setTasks(updatedTasks);
        updateGantt(updatedTasks, links);
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
            const updatedTasks = tasks.map(task => {
                const link = dependentLinks.find(l => l.target === task.id);
                if (link) {
                    const oldDepStart = new Date(task.start_date);
                    const oldDepEnd = new Date(task.end_date);
                    const durationMs = oldDepEnd.getTime() - oldDepStart.getTime();
                    let newDepStart: Date;
                    let newDepEnd: Date;
                    let gap: number;
                    switch (link.type) {
                        case "0":
                            gap = link.initialGap ?? (oldDepStart.getTime() - new Date(existingTask.end_date).getTime());
                            newDepStart = new Date(newPredEnd.getTime() + gap);
                            newDepEnd = new Date(newDepStart.getTime() + durationMs);
                            break;
                        case "1":
                            gap = link.initialGap ?? (oldDepStart.getTime() - new Date(existingTask.start_date).getTime());
                            newDepStart = new Date(newPredStart.getTime() + gap);
                            newDepEnd = new Date(newDepStart.getTime() + durationMs);
                            break;
                        case "2":
                            gap = link.initialGap ?? (oldDepEnd.getTime() - new Date(existingTask.end_date).getTime());
                            newDepEnd = new Date(newPredEnd.getTime() + gap);
                            newDepStart = new Date(newDepEnd.getTime() - durationMs);
                            break;
                        case "3":
                            gap = link.initialGap ?? (oldDepEnd.getTime() - new Date(existingTask.start_date).getTime());
                            newDepEnd = new Date(newPredStart.getTime() + gap);
                            newDepStart = new Date(newDepEnd.getTime() - durationMs);
                            break;
                        default:
                            return task;
                    }
                    return {
                        ...task,
                        start_date: formatDateTime(newDepStart),
                        end_date: formatDateTime(newDepEnd),
                        duration: durationMs / (1000 * 60 * 60)
                    };
                }
                return task;
            });
            setTasks(updatedTasks);
            updateGantt(updatedTasks, links);
        } else {
            const updatedTasks = tasks.map(task => task.id === updatedTask.id ? { ...task, ...updatedTask } : task);
            setTasks(updatedTasks);
            updateGantt(updatedTasks, links);
        }
    };

    const sortedTasks = [...tasks].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
    );
    const tasksData = { data: sortedTasks, links };

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

    if (status === "loading") {
        return <p>Chargement...</p>;
    }

    if (!session) {
        return (
            <div className="homepage-container">
                <header className="homepage-header">
                    <h1>Gantt App</h1>
                    <p className="lead">Gestion de projet multi-groupes</p>
                </header>
                <main className="homepage-main">
                    <form className="homepage-form">
                        <p>Vous n'êtes pas connecté.</p>
                        <Link href="/signin">Se connecter</Link>
                    </form>
                </main>
                <footer className="homepage-footer">
                    <p>© 2021 Gantt App</p>
                </footer>
            </div>
        );
    }

    const userGroupId = (session.user as any).groupId;

    return (
        <div className="homepage-container">
            <header className="homepage-header p-3">
                <Row className="align-items-center">
                    <Col className={"text-lg-start"}>
                        <h1>Gantt App</h1>
                        <p className="lead">Gestion de projet multi-groupes</p>
                    </Col>
                    <Col className="text-end">
                        <Button variant="danger" onClick={() => signOut({ callbackUrl: "/" })}>
                            Déconnexion
                        </Button>
                    </Col>
                </Row>
            </header>
            <main className="homepage-main">
                <Container className="p-3">
                    <Row className="align-items-center mb-3">
                        <Col>
                            <h2>Bienvenue sur votre Gantt, groupe : {userGroupId}</h2>
                        </Col>
                        <Col className="text-end">
                            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                                Ajouter une tâche
                            </Button>
                        </Col>
                    </Row>

                    <section className="mb-4">
                        <h3>Liste des tâches</h3>
                        {sortedTasks.length === 0 ? (
                            <p>Aucune tâche à afficher.</p>
                        ) : (
                            <ul className="list-group">
                                {sortedTasks.map(task => (
                                    <li key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5>{task.text}</h5>
                                            <small>
                                                Spécialités : {task.specialty.join(", ")} | Début : {formatDateOnly(task.start_date)} {new Date(task.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | Fin : {formatDateOnly(task.end_date)} {new Date(task.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </small>
                                        </div>
                                        <div>
                                            <Button variant="secondary" size="sm" onClick={() => handleEditClick(task)}>
                                                Modifier
                                            </Button>{" "}
                                            <Button variant="danger" size="sm" onClick={() => handleDeleteTask(task.id)}>
                                                Supprimer
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <h3>Diagramme de Gantt</h3>
                        {sortedTasks.length === 0 ? (
                            <p>Aucune tâche ajoutée. Cliquez sur "Ajouter une tâche" pour démarrer.</p>
                        ) : (
                            <GanttChart
                                tasksData={tasksData}
                                onTaskUpdate={handleGanttTaskUpdate}
                                onLinkChange={(newLinks: Link[]) => {
                                    setLinks(newLinks);
                                    updateGantt(tasks, newLinks);
                                }}
                            />
                        )}
                    </section>
                </Container>
            </main>
            <footer className="homepage-footer">
                <p>© {new Date().getFullYear()} Gantt App. Tous droits réservés.</p>
            </footer>

            {/* Modal d'ajout de tâche */}
            {isModalOpen && (
                <>
                    <div className="fullpage-overlay" onClick={() => setIsModalOpen(false)}></div>
                    <div className="modal show fade d-block" tabIndex={-1} role="dialog">
                        <div className="modal-dialog modal-dialog-centered" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Ajouter une tâche</h5>
                                    <button type="button" className="close" onClick={() => setIsModalOpen(false)}>
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
                                        <div className="form-group mb-3">
                                            <label>Date et heure de début</label>
                                            <DatePicker
                                                selected={newStartDate}
                                                onChange={(date: Date | null) => setNewStartDate(date)}
                                                showTimeSelect
                                                timeFormat="HH:mm"
                                                timeIntervals={15}
                                                dateFormat="yyyy-MM-dd HH:mm"
                                                className="form-control"
                                                placeholderText="Sélectionnez la date et l'heure de début"
                                            />
                                        </div>
                                        <div className="form-group mb-3">
                                            <label>Date et heure de fin</label>
                                            <DatePicker
                                                selected={newEndDate}
                                                onChange={(date: Date | null) => setNewEndDate(date)}
                                                showTimeSelect
                                                timeFormat="HH:mm"
                                                timeIntervals={15}
                                                dateFormat="yyyy-MM-dd HH:mm"
                                                className="form-control"
                                                placeholderText="Sélectionnez la date et l'heure de fin"
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

            {/* Modal d'édition de tâche */}
            {editingTask && (
                <>
                    <div className="fullpage-overlay" onClick={() => setEditingTask(null)}></div>
                    <div className="modal show fade d-block" tabIndex={-1} role="dialog">
                        <div className="modal-dialog modal-dialog-centered" role="document">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Modifier la tâche</h5>
                                    <button type="button" className="close" onClick={() => setEditingTask(null)}>
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
                                        <div className="form-group mb-3">
                                            <label>Date et heure de début</label>
                                            <DatePicker
                                                selected={editStartDate}
                                                onChange={(date: Date | null) => setEditStartDate(date)}
                                                showTimeSelect
                                                timeFormat="HH:mm"
                                                timeIntervals={15}
                                                dateFormat="yyyy-MM-dd HH:mm"
                                                className="form-control"
                                                placeholderText="Sélectionnez la date et l'heure de début"
                                            />
                                        </div>
                                        <div className="form-group mb-3">
                                            <label>Date et heure de fin</label>
                                            <DatePicker
                                                selected={editEndDate}
                                                onChange={(date: Date | null) => setEditEndDate(date)}
                                                showTimeSelect
                                                timeFormat="HH:mm"
                                                timeIntervals={15}
                                                dateFormat="yyyy-MM-dd HH:mm"
                                                className="form-control"
                                                placeholderText="Sélectionnez la date et l'heure de fin"
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