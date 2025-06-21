import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import useAuthFormModel from "../hooks/useAuthFormModel";
import { supabase } from '@/lib/supabaseClient';

const Signup = ({ userType, onClose, onSignup }: { userType: string; onClose: () => void; onSignup: (userType: string) => void }) => {
    const {
        email,
        password,
        username,
        selectedUserType,
        handleEmailChange,
        handlePasswordChange,
        handleUsernameChange,
    } = useAuthFormModel({ initialUserType: userType });

    const { signup } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const validateEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setValidationError(null);

        if (!validateEmail(email)) {
            setValidationError("Please enter a valid email address.");
            return;
        }

        if (password.length < 6) {
            setValidationError("Password must be at least 6 characters long.");
            return;
        }

        // console.log("Signup form password:", password);

        try {
            const { error: signupError, user } = await signup(email, password);
            if (signupError) {
                console.error("Signup error:", signupError);
                setError(signupError.message);
                return;
            }
            console.log("user info", user)
            if (user) {
                console.log("email", email);
                const { data, error } = await supabase.from('UsersData')
                    .insert([
                        { id: user.id, username: username, email: email, user_type: selectedUserType, password: password },
                    ])
                    .select()
                if (data) {
                    onSignup(data[0].user_type)
                    onClose();
                }
            }
        } catch (err) {
            console.error("Unexpected error during signup:", err);
            setError("An unexpected error occurred. Please try again.");
        }
    };

    return (
        <form onSubmit={handleSignup} className="space-y-4">
            <h2 className="text-2xl font-semibold text-center">{selectedUserType === "patient" ? "Patient Signup" : "Caretaker Signup"}</h2>
            <input
                type="text"
                placeholder="Username"
                className="w-full border rounded p-2"
                value={username}
                onChange={handleUsernameChange}
                required
            />
            <input
                type="email"
                placeholder="Email"
                className="w-full border rounded p-2"
                value={email}
                onChange={handleEmailChange}
                required
            />
            <input
                type="password"
                placeholder="Password"
                className="w-full border rounded p-2"
                value={password}
                onChange={handlePasswordChange}
                required
            />
            {validationError && <p className="text-red-600">{validationError}</p>}
            {error && <p className="text-red-600">{error}</p>}
            <button type="submit" className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
                Signup
            </button>
        </form>
    );
};

export default Signup;
