"use client";

import React, { FormEvent } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get("email") as string;

        await signIn("credentials", {
            email,
            callbackUrl: "/"
        });
    };

    return (
        <div className="signin-container">
            <header className="homepage-header">
                <h1>Gantt App</h1>
                <p className="lead">Gestion de projet multi-groupes</p>
            </header>
            <main className="signin-main">
                <form className="signin-form" onSubmit={handleSubmit}>
                    <h2>Se connecter</h2>
                    <div className="form-group">
                        <label>Email&nbsp;:</label>
                        <input name="email" type="email" required />
                    </div>
                    <button type="submit" className="btn btn-primary">Connexion</button>
                </form>
            </main>
            <footer className="homepage-footer">
                <p>© 2021 Gantt App</p>
            </footer>
        </div>
    );
}