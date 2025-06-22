import { useState } from "react";
import Onboarding from "@/components/Onboarding";
import PatientDashboard from "@/components/PatientDashboard";

import { Button } from "@/components/ui/button";
import { Users, User } from "lucide-react";
import Login from "@/components/Login";
import Signup from "@/components/Signup";
import Dashboard from "@/components/Dashboard";

type UserType = "patient" | "caretaker" | null;
type AuthMode = "login" | "signup";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

const Index = () => {
  const [userType, setUserType] = useState<UserType>(null);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  useEffect(() => {
    const fetchUserType = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      // if (error) {
      //   console.error("Error fetching user:", error.message);
      //   return;
      // }

      if (user && user.user_metadata && user.user_metadata.user_type) {
        setUserType(user.user_metadata.user_type);
        setIsLoggedIn(true);
        setIsOnboarded(true);
      }
    };

    fetchUserType();
  }, []);

  const handleOnboardingComplete = (type: UserType) => {
    setUserType(type);
    setIsOnboarded(true);
  };

  const switchUserType = () => {
    const newType = userType === "patient" ? "caretaker" : "patient";
    setUserType(newType);
    setIsLoggedIn(false);
    setAuthMode("login");
  };

  const handleLogin = (type: UserType) => {
    setUserType(type);
    setIsLoggedIn(true);
  };

  const handleSignup = (type: UserType) => {
    setUserType(type);
    setIsLoggedIn(false);
    setAuthMode("login");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserType(null);
    setIsOnboarded(false);
    setAuthMode("login");
    localStorage.clear()
  };

  if (!isOnboarded) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
          {authMode === "login" ? (
            <Login userType={userType || "patient"} onClose={() => { }} onLogin={handleLogin} />
          ) : (
            <Signup userType={userType || "patient"} onClose={() => { }} onSignup={handleSignup} />
          )}
          {userType === "caretaker" && (
            <div className="p-4 text-right">
              {authMode === "login" ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => setAuthMode("signup")}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => setAuthMode("login")}
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-border/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MediCare Companion</h1>
              <p className="text-sm text-muted-foreground">
                {userType === "patient" ? "Patient View" : "Caretaker View"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={switchUserType}
              className="flex items-center gap-2 hover:bg-accent transition-colors"
            >
              {userType === "patient" ? <Users className="w-4 h-4" /> : <User className="w-4 h-4" />}
              Switch to {userType === "patient" ? "Caretaker" : "Patient"}
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {userType === "patient" ? <PatientDashboard /> : <Dashboard />}
      </main>
    </div>
  );
};

export default Index;
