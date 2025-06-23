import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import useAuthFormModel from "../hooks/useAuthFormModel";
import { supabase } from '@/lib/supabaseClient';
import Loader from './Loader';
const Signup = ({
    userType,
    onClose,
    onSignup,
}: {
    userType: string;
    onClose: () => void;
    onSignup: (userType: string) => void;
}) => {
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
    const [isFormValid, setIsFormValid] = useState(false);

    const validateEmail = (email: string) => {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };
    const getPasswordValidationError = (password: string) => {
        if (password.length < 8) {
            return "Password must be at least 8 characters long.";
        }
        if (!/[A-Z]/.test(password)) {
            return "Password must contain at least one uppercase letter.";
        }
        if (!/[a-z]/.test(password)) {
            return "Password must contain at least one lowercase letter.";
        }
        if (!/\d/.test(password)) {
            return "Password must contain at least one digit.";
        }
        if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
            return "Password must contain at least one special character.";
        }
        return null;
    };

    useEffect(() => {
        // Validate form on email or password
        if (!validateEmail(email)) {
            setValidationError("Enter Details");
            setIsFormValid(false);
            return;
        }
        const pwdError = getPasswordValidationError(password);
        if (pwdError) {
            setValidationError(pwdError);
            setIsFormValid(false);
            return;
        }
        setValidationError(null);
        setIsFormValid(true);
    }, [email, password]);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setValidationError(null);

        if (!validateEmail(email)) {
            setValidationError("Please enter a valid email address.");
            return;
        }

        const pwdError = getPasswordValidationError(password);
        if (pwdError) {
            setValidationError(pwdError);
            return;
        }

        try {
            const { error: signupError, user } = await signup(email, password);
            if (signupError) {
                console.error("Signup error:", signupError);
                setError(signupError.message);
                return;
            }

            if (user) {
                const { data, error } = await supabase
                    .from('UsersData')
                    .insert([
                        {
                            id: user.id,
                            username: username,
                            email: email,
                            user_type: selectedUserType,
                            password: password,
                        },
                    ])
                    .select();

                if (data) {
                    if (selectedUserType === 'caretaker') {
                        localStorage.setItem(
                            'caretakerDetails',
                            JSON.stringify({
                                id: data[0].id,
                                username: data[0].username,
                                email: data[0].email,
                                user_type: data[0].user_type,
                            })
                        );
                    }

                    onSignup(data[0].user_type);
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
            <h2 className="text-2xl font-semibold text-center">
                Sign up
            </h2>
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
            <button
                type="submit"
                className={`w-full py-2 rounded text-white ${isFormValid ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                disabled={!isFormValid}
            >
                Signup
            </button>
        </form>
    );
};

export default Signup;
