import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import useAuthFormModel from "../hooks/useAuthFormModel";
import { supabase } from '@/lib/supabaseClient';

const Login = ({ userType, onClose, onLogin }: { userType: string; onClose: () => void; onLogin: (userType: string) => void }) => {
    const {
        email,
        password,
        selectedUserType,
        handleEmailChange,
        handlePasswordChange,
    } = useAuthFormModel({ initialUserType: userType });

    const { login } = useAuth();
    const [error, setError] = useState<string | null>(null);
    const [validationError, setValidationError] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setValidationError(null);

        if (!email) {
            setValidationError("Email Required");
            return;
        }

        if (!password) {
            setValidationError("Password Required");
            return;
        }
        const { error } = await login(email, password);
        if (error) {
            setError(error.message);
        } else {
            let { data, error } = await supabase.from('UsersData').select("*").eq('email', email)
            const user = data[0]
            onLogin(user.user_type);
            onClose();
        }
    };
    return (
        <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-2xl font-semibold text-center">{selectedUserType === "patient" ? "Patient Signin" : "Caretaker Signin"}</h2>
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
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Sign in
            </button>
        </form>
    );
};

export default Login;
