import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { supabase } from "@/lib/supabaseClient";

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
                if (!credentials?.email) return null;

                const { data, error } = await supabase
                    .from("users")
                    .select("id, email, group_id")
                    .eq("email", credentials.email)
                    .single();

                if (error || !data) {
                    return null;
                }

                return {
                    id: data.id.toString(),
                    email: data.email,
                    groupId: data.group_id,
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.user = user;
            }
            return token;
        },
        async session({ session, token }) {
            if (token?.user) {
                session.user = token.user as any;
            }
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/signin",
    },
};