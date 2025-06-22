import { supabase } from "@/lib/supabaseClient";
import React, { useEffect, useState } from "react";

interface Patient {
    id: string;
    email: string;
    username: string;
    Assigned: string;
}

const Dashboard: React.FC = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [newPatient, setNewPatient] = useState({
        email: "",
        username: "",
        password: ""
    });

    useEffect(() => {
        fetchPatients();
    }, []);

    const fetchPatients = async () => {
        const {
            data: { user: caretaker },
        } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from("UsersData")
            .select("*")
            .eq("Assigned", caretaker?.id)
            .eq("user_type", "patient");

        if (error) {
            console.error("Error fetching patients:", error);
        } else {
            setPatients(data as Patient[]);
        }
    };

    const handleAddPatient = async () => {
        const { email, username, password } = newPatient;

        // Create patient auth account
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    user_type: "patient"
                }
            }
        });

        if (authError) {
            console.error("Auth error:", authError.message);
            return;
        }

        const patientId = authData.user?.id;
        if (!patientId) {
            console.error("Patient ID missing after signup");
            return;
        }

        // Get caretaker's ID
        const {
            data: { user: caretaker },
            error: caretakerError
        } = await supabase.auth.getUser();

        if (caretakerError || !caretaker?.id) {
            console.error("Caretaker fetch error:", caretakerError?.message);
            return;
        }

        // Insert into UsersData
        const { error: insertError } = await supabase.from("UsersData").insert([
            {
                id: patientId,
                username,
                user_type: "patient",
                password,
                email,
                Assigned: caretaker.id
            }
        ]);

        if (insertError) {
            console.error("Insert error:", insertError.message);
            return;
        }

        setNewPatient({ email: "", username: "", password: "" });
        setShowModal(false);
        fetchPatients();
    };

    return (
        <div className="min-h-screen flex bg-gray-100">
            <main className="flex-1 p-8">
                <div className="w-full mb-6 flex justify-center">
                    <button
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
                        onClick={() => setShowModal(true)}
                    >
                        Add patient
                    </button>
                </div>

                <div className="bg-white shadow-md rounded-lg overflow-hidden">
                    <table className="min-w-full text-left">
                        <thead className="bg-purple-100 text-purple-700">
                            <tr>
                                <th className="py-3 px-6">Email</th>
                                <th className="py-3 px-6">Username</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patients.length === 0 ? (
                                <tr>
                                    <td colSpan={2} className="py-6 text-center text-gray-500">
                                        No patients found.
                                    </td>
                                </tr>
                            ) : (
                                patients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-gray-50 transition">
                                        <td className="py-3 px-6">{patient.email}</td>
                                        <td className="py-3 px-6">{patient.username}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
                            <h2 className="text-xl font-bold mb-4">Add New Patient</h2>
                            <div className="space-y-3">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={newPatient.email}
                                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                                    className="w-full border border-gray-300 px-4 py-2 rounded"
                                />
                                <input
                                    type="text"
                                    placeholder="Username"
                                    value={newPatient.username}
                                    onChange={(e) => setNewPatient({ ...newPatient, username: e.target.value })}
                                    className="w-full border border-gray-300 px-4 py-2 rounded"
                                />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={newPatient.password}
                                    onChange={(e) => setNewPatient({ ...newPatient, password: e.target.value })}
                                    className="w-full border border-gray-300 px-4 py-2 rounded"
                                />
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setShowModal(false)} className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded">
                                    Cancel
                                </button>
                                <button onClick={handleAddPatient} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;
