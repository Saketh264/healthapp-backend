import { useEffect, useState } from "react";
import PatientDashboard from "@/components/dashboard/PatientDashboard";
import DoctorDashboard from "@/components/dashboard/DoctorDashboard";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const savedRole = localStorage.getItem("role");

    if (!token) {
      setLoading(false);
      return;
    }

    setRole(savedRole);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ❌ Not logged in
  if (!localStorage.getItem("token")) {
    return <Navigate to="/auth" replace />;
  }

  // ✅ Role-based rendering
  if (role === "patient") return <PatientDashboard />;
  if (role === "doctor") return <DoctorDashboard />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Invalid role</p>
    </div>
  );
};

export default Dashboard;