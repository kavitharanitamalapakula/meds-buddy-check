import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { toast } from "@/hooks/use-toast";

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ error: Error | null }>;
    signup: (email: string, password: string) => Promise<{ error: Error | null; user?: User }>;
    insertUserProfile: (userId: string, username: string, userType: string) => Promise<Error | null>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const session = supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
        });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, password: string) => {
        try {
            const { error, data } = await supabase.auth.signInWithPassword({ email, password });
            if (!error && data?.session) {
                setUser(data.session.user);
                return { error: null };
            }
            if (error && error.message.includes("Email not confirmed")) {
                return { error: new Error("Please confirm your email before logging in.") };
            }
            if (error) {
                console.error("Login error:", error);
            }
            return { error };
        } catch (err) {
            console.error("Unexpected error during login:", err);
            return { error: new Error("Unexpected error during login.") };
        }
    };

    const signup = async (email: string, password: string) => {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();
        const { error, data } = await supabase.auth.signUp({ email: trimmedEmail, password: trimmedPassword });
        const user = data.user ?? data.session?.user ?? null;
        if (!error && user) {
            // After signup, sign in the user to create session
            const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password: trimmedPassword });
            if (!signInError && signInData?.session) {
                setUser(signInData.session.user);
                return { error: null, user: signInData.session.user };
            } else {
                console.error("Sign in after signup error:", signInError);
                return { error: signInError };
            }
        }
        if (error) {
            console.error("Signup error:", error);
        }
        return { error };
    };

    const insertUserProfile = async (userId: string, username: string, userType: string, password?: string): Promise<Error | null> => {
        const insertData: any = { id: userId, username: username, user_type: userType, password: password };
        if (password !== undefined) {
            insertData.password = password;
        }
        const { error } = await supabase
            .from('UsersData')
            .insert([insertData]);
        return error || null;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        toast({
            title: "Successfully logged out",
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, insertUserProfile, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
