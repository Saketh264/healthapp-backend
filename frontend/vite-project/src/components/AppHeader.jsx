import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, Shield, User, LayoutDashboard } from "lucide-react";

const AppHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // 🔥 GET DATA FROM LOCAL STORAGE
  const email = localStorage.getItem("email");
  const role = localStorage.getItem("role"); // "patient" / "doctor"

  const handleSignOut = () => {
    // 🔥 CLEAR STORAGE
    localStorage.removeItem("token");
    localStorage.removeItem("email");
    localStorage.removeItem("role");

    navigate("/");
  };

  // 🔥 IF NOT LOGGED IN
  if (!email) return null;

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>

          <span
            className="font-bold text-lg gradient-text cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            HealthVault
          </span>

          <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full capitalize">
            {role}
          </span>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-2">

          <Button
            variant={location.pathname === "/dashboard" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <LayoutDashboard className="w-4 h-4 mr-1" />
            Dashboard
          </Button>

          <Button
            variant={location.pathname === "/profile" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/profile")}
          >
            <User className="w-4 h-4 mr-1" />
            Profile
          </Button>

          {/* EMAIL */}
          <span className="text-sm text-muted-foreground hidden sm:block">
            {email}
          </span>

          {/* LOGOUT */}
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;