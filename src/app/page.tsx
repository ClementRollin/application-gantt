"use client";

import dynamic from "next/dynamic";
import React, { useState, useEffect, FormEvent, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button, Container, Row, Col } from "react-bootstrap";

const GanttChart = dynamic(() => import("./components/GanttChartComponent"), {
    ssr: false,
});

const specialtyOptions = ["UI/UX", "Dev front", "Dev back", "Marketing", "DA", "tout le groupe"];

export interface Task {
    id: string;
    text: string;
    specialty: string[];
    start_date: string;
    end_date: string;
    duration: number;
    progress: number;
    open: boolean;
}

export interface LinkType {
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

const formatDateOnly = (dateInput: string | Date): string => {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const getParentDelta = (oldParent: Task, newParent: Task, linkType: LinkType["type"]): number => {
    let refOld: number, refNew: number;
    if (linkType === "0" || linkType === "2") {
        refOld = new Date(oldParent.end_date).getTime();
        refNew = new Date(newParent.end_date).getTime();
    } else {
        refOld = new Date(oldParent.start_date).getTime();
        refNew = new Date(newParent.start_date).getTime();
    }
    return refNew - refOld;
};

const updateLinksInitialGap = (oldParent: Task, tasks: Task[], links: LinkType[]): LinkType[] => {
    return links.map(link => {
        if (link.source === oldParent.id && link.initialGap === undefined) {
            const depTask = tasks.find(t => t.id === link.target);
            if (depTask) {
                const gap = new Date(depTask.start_date).getTime() - new Date(oldParent.end_date).getTime();
                return { ...link, initialGap: gap };
            }
        }
        return link;
    });
};

const propagateDependentTasks = (
    oldParent: Task,
    newParent: Task,
    tasks: Task[],
    links: LinkType[]
): Task[] => {
    const updatedLinks: LinkType[] = updateLinksInitialGap(oldParent, tasks, links);
    return tasks.map((task: Task) => {
        if (task.id === oldParent.id) return newParent;
        const link = updatedLinks.find(l => l.source === oldParent.id && l.target === task.id);
        if (link) {
            const gap = link.initialGap !== undefined
                ? link.initialGap
                : new Date(task.start_date).getTime() - new Date(oldParent.end_date).getTime();
            const childDurationMs = new Date(task.end_date).getTime() - new Date(task.start_date).getTime();
            const newChildStart = new Date(new Date(newParent.end_date).getTime() + gap);
            const newChildEnd = new Date(newChildStart.getTime() + childDurationMs);
            return {
                ...task,
                start_date: formatDateTime(newChildStart),
                end_date: formatDateTime(newChildEnd),
                duration: childDurationMs / (1000 * 60 * 60)
            };
        }
        return task;
    });
};

export default function HomePage() {
    const { data: session, status } = useSession();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [links, setLinks] = useState<LinkType[]>([]);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

    const [newDependentId, setNewDependentId] = useState<string>("");
    const [editDependentId, setEditDependentId] = useState<string>("");

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

    useEffect(() => {
        if (session) {
            const userGroupId = (session.user as any).groupId;
            async function loadGanttData() {
                try {
                    const res = await fetch(`/api/gantt/${userGroupId}`, { credentials: "include" });
                    if (!res.ok) throw new Error("Erreur lors du chargement des données du Gantt");
                    const data = await res.json();
                    const { tasks: dbTasks, links: dbLinks } = data;
                    const parsedTasks: Task[] = dbTasks.map((t: any) => ({
                        ...t,
                        start_date: formatDateTime(new Date(t.start_date)),
                        end_date: formatDateTime(new Date(t.end_date)),
                    }));
                    setTasks(parsedTasks);
                    setLinks(dbLinks || []);
                } catch (error) {
                    console.error(error);
                }
            }
            loadGanttData();
        }
    }, [session]);

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

    async function updateGantt(newTasks: Task[], newLinks: LinkType[]) {
        if (session) {
            const userGroupId = (session.user as any).groupId;
            const res = await fetch(`/api/gantt/${userGroupId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ tasks: newTasks, links: newLinks })
            });
            if (!res.ok) console.error("Erreur lors de la mise à jour du Gantt");
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
            open: true,
        };

        let updatedTasks: Task[] = [...tasks, newTask];
        let updatedLinks: LinkType[] = [...links];

        if (newDependentId) {
            const dependentTask = tasks.find(t => t.id === newDependentId);
            if (dependentTask) {
                const newLink: LinkType = {
                    id: Date.now().toString(),
                    source: newTask.id,
                    target: newDependentId,
                    type: "0",
                    initialGap: new Date(dependentTask.start_date).getTime() - new Date(newTask.end_date).getTime()
                };
                updatedLinks.push(newLink);
            }
            setNewDependentId("");
        }

        setTasks(updatedTasks);
        setLinks(updatedLinks);
        updateGantt(updatedTasks, updatedLinks);

        setNewTaskName("");
        setNewSpecialty(["UI/UX"]);
        setNewStartDate(null);
        setNewEndDate(null);
        setNewProgress(0);
        setIsModalOpen(false);
    };

    const handleDeleteTask = (id: string) => {
        const updatedTasks: Task[] = tasks.filter(task => task.id !== id);
        const updatedLinks: LinkType[] = links.filter(link => link.source !== id && link.target !== id);
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
        const existingLink = links.find(link => link.source === task.id);
        setEditDependentId(existingLink ? existingLink.target : "");
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

        const dependentLinks = links.filter(link => link.source === editingTask.id);
        let newTasks: Task[];
        if (dependentLinks.length > 0) {
            newTasks = propagateDependentTasks(editingTask, updatedTask, tasks, links);
        } else {
            newTasks = tasks.map(task =>
                task.id === updatedTask.id ? updatedTask : task
            );
        }

        let newLinks: LinkType[] = [...links];
        const existingLink = links.find(link => link.source === editingTask.id);
        if (editDependentId) {
            const dependentTask = tasks.find(t => t.id === editDependentId);
            if (dependentTask) {
                if (existingLink) {
                    newLinks = newLinks.map(link =>
                        link.source === editingTask.id
                            ? {
                                ...link,
                                target: editDependentId,
                                initialGap: new Date(dependentTask.start_date).getTime() - new Date(updatedTask.end_date).getTime()
                            }
                            : link
                    );
                } else {
                    const newLink: LinkType = {
                        id: Date.now().toString(),
                        source: editingTask.id,
                        target: editDependentId,
                        type: "0",
                        initialGap: new Date(dependentTask.start_date).getTime() - new Date(updatedTask.end_date).getTime()
                    };
                    newLinks.push(newLink);
                }
            }
        } else {
            if (existingLink) {
                newLinks = newLinks.filter(link => link.source !== editingTask.id);
            }
        }

        setTasks(newTasks);
        setLinks(newLinks);
        updateGantt(newTasks, newLinks);
        setEditingTask(null);
        isUpdatingRef.current = false;
    };

    const tasksData = {
        data: [...tasks].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()),
        links
    };

    const handleSpecialtyChange = (value: string, checked: boolean, isEdit = false) => {
        if (isEdit) {
            if (checked) {
                setEditSpecialty((prev: string[]) => [...prev, value]);
            } else {
                setEditSpecialty((prev: string[]) => prev.filter((s: string) => s !== value));
            }
        } else {
            if (checked) {
                setNewSpecialty((prev: string[]) => [...prev, value]);
            } else {
                setNewSpecialty((prev: string[]) => prev.filter((s: string) => s !== value));
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
                <Container className={"p-3"}>
                    <Row className="align-items-center">
                        <Col className="text-lg-start">
                            <h1>Gantt App</h1>
                            <p className="lead">Gestion de projet multi-groupes</p>
                        </Col>
                        <Col className="text-end">
                            <Button variant="danger" onClick={() => signOut({ callbackUrl: "/" })}>
                                Déconnexion
                            </Button>
                        </Col>
                    </Row>
                </Container>
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
                        {tasks.length === 0 ? (
                            <p>Aucune tâche à afficher.</p>
                        ) : (
                            <ul className="list-group">
                                {tasks.map((task: Task) => (
                                    <li key={task.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5><strong>{task.text}</strong></h5>
                                            <small>
                                                <strong>Spécialités :</strong> {task.specialty.join(", ")} | <strong>Début :</strong> {formatDateOnly(task.start_date)}{" "}
                                                {new Date(task.start_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | <strong>Fin :</strong>{" "}
                                                {formatDateOnly(task.end_date)}{" "}
                                                {new Date(task.end_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} | <strong>Durée :</strong>{" "}
                                                {(
                                                    (new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) /
                                                    (1000 * 60 * 60)
                                                ).toFixed(2)}{" "}
                                                heure(s) | <strong>Progression :</strong> {Math.round(task.progress * 100)}%
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
                        {tasks.length === 0 ? (
                            <p>Aucune tâche ajoutée. Cliquez sur "Ajouter une tâche" pour démarrer.</p>
                        ) : (
                            <GanttChart tasksData={tasksData} />
                        )}
                    </section>
                </Container>
            </main>
            <footer className="homepage-footer">
                <p>© {new Date().getFullYear()} Gantt App. Tous droits réservés.</p>
            </footer>

            {isModalOpen && (
                <>
                    <div className="fullpage-overlay" onClick={() => setIsModalOpen(false)}></div>
                    <div className="modal show fade d-block" tabIndex={-1} role="dialog">
                        <div className="modal-dialog modal-dialog-centered" role="document">
                            <div className="modal-content">
                                <div className="modal-header d-flex justify-content-between align-items-center">
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
                                                {specialtyOptions.map((option: string) => (
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
                                                dateFormat="yyyy-MM-dd HH:mm"
                                                className="form-control"
                                                placeholderText="Sélectionnez la date et l'heure de début"
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
                                        <div className="form-group mb-3">
                                            <label>Tâche dépendante</label>
                                            <select
                                                className="form-control"
                                                value={newDependentId}
                                                onChange={(e) => setNewDependentId(e.target.value)}
                                            >
                                                <option value="">Aucune</option>
                                                {tasks.map((task: Task) => (
                                                    <option key={task.id} value={task.id}>
                                                        {task.text}
                                                    </option>
                                                ))}
                                            </select>
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
                                <div className="modal-header d-flex justify-content-between align-items-center">
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
                                                {specialtyOptions.map((option: string) => (
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
                                                dateFormat="yyyy-MM-dd HH:mm"
                                                className="form-control"
                                                placeholderText="Sélectionnez la date et l'heure de début"
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
                                        <div className="form-group mb-3">
                                            <label>Tâche dépendante</label>
                                            <select
                                                className="form-control"
                                                value={editDependentId}
                                                onChange={(e) => setEditDependentId(e.target.value)}
                                            >
                                                <option value="">Aucune</option>
                                                {tasks.filter((t: Task) => t.id !== editingTask.id).map((task: Task) => (
                                                    <option key={task.id} value={task.id}>
                                                        {task.text}
                                                    </option>
                                                ))}
                                            </select>
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