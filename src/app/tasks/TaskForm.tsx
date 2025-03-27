// /app/tasks/TaskForm.tsx
"use client";
import { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

interface TaskFormProps {
    show: boolean;
    onHide: () => void;
    onSubmit: (task: any) => void;
    initialData?: any;
}

export default function TaskForm({ show, onHide, onSubmit, initialData = {} }: TaskFormProps) {
    const [name, setName] = useState(initialData.text || "");
    const [startDate, setStartDate] = useState(initialData.start_date || "");
    const [endDate, setEndDate] = useState(initialData.end_date || "");
    const [progress, setProgress] = useState(initialData.progress || 0);

    useEffect(() => {
        setName(initialData.text || "");
        setStartDate(initialData.start_date || "");
        setEndDate(initialData.end_date || "");
        setProgress(initialData.progress || 0);
    }, [initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const task = {
            ...initialData,
            text: name,
            start_date: startDate,
            end_date: endDate,
            progress: progress,
        };
        onSubmit(task);
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide}>
            <Modal.Header closeButton>
                <Modal.Title>{initialData.id ? "Modifier la tâche" : "Nouvelle tâche"}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Form.Group controlId="taskName">
                        <Form.Label>Nom de la tâche</Form.Label>
                        <Form.Control
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="startDate" className="mt-3">
                        <Form.Label>Date de début</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="endDate" className="mt-3">
                        <Form.Label>Date de fin</Form.Label>
                        <Form.Control
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            required
                        />
                    </Form.Group>
                    <Form.Group controlId="progress" className="mt-3">
                        <Form.Label>Progression (%)</Form.Label>
                        <Form.Control
                            type="number"
                            value={progress}
                            onChange={(e) => setProgress(Number(e.target.value))}
                            min={0}
                            max={100}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>
                        Annuler
                    </Button>
                    <Button variant="primary" type="submit">
                        Enregistrer
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}