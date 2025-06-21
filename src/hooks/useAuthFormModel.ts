import { useState, useEffect } from "react";

interface UseAuthFormModelProps {
    initialUserType: string;
}

const useAuthFormModel = ({ initialUserType }: UseAuthFormModelProps) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [selectedUserType, setSelectedUserType] = useState(initialUserType);

    useEffect(() => {
        setSelectedUserType(initialUserType);
    }, [initialUserType]);

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
    };

    const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUsername(e.target.value);
    };

    const handleUserTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedUserType(e.target.value);
    };

    const resetForm = () => {
        setEmail("");
        setPassword("");
        setUsername("");
        setSelectedUserType(initialUserType);
    };

    return {
        email,
        password,
        username,
        selectedUserType,
        handleEmailChange,
        handlePasswordChange,
        handleUsernameChange,
        handleUserTypeChange,
        resetForm,
    };
};

export default useAuthFormModel;
