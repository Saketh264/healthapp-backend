import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode"; // 🔥 NEW
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Stethoscope, Shield } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let res;

      // 🔐 LOGIN
      if (isLogin) {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        res = await fetch(`${BASE_URL}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData,
        });
      }

      // 📝 SIGNUP
      else {
        const endpoint =
          role === "doctor" ? "/doctor/signup" : "/signup";

        res = await fetch(`${BASE_URL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Something went wrong");
      }

      // ✅ LOGIN SUCCESS
      if (isLogin && data.access_token) {
        const token = data.access_token;

        // 🔥 STORE TOKEN
        localStorage.setItem("token", token);

        // 🔥 DECODE TOKEN
        const decoded = jwtDecode(token);
        console.log("DECODED:", decoded);

        // EXPECTING: { sub: email, role: "patient" }
        localStorage.setItem("role", decoded.role);
        localStorage.setItem("email", decoded.sub);

        // 🔥 REDIRECT BASED ON ROLE
        if (decoded.role === "patient") {
          navigate("/dashboard");
        } else if (decoded.role === "doctor") {
          navigate("/dashboard"); // same route, dashboard decides UI
        } else {
          alert("Invalid role");
        }
      }

      // ✅ SIGNUP SUCCESS
      else {
        alert("Signup successful! Please login.");
        setIsLogin(true);
      }

    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">HealthVault</h1>
          <p className="text-muted-foreground mt-2">
            Unified Health Record Management
          </p>
        </div>

        {/* CARD */}
        <Card>
          <CardHeader>
            <CardTitle>
              {isLogin ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {isLogin
                ? "Access your health records securely"
                : "Join to manage your health data"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ROLE SELECT */}
              {!isLogin && (
                <div>
                  <Label>Select Role</Label>
                  <div className="flex gap-2 mt-2">

                    <button
                      type="button"
                      onClick={() => setRole("patient")}
                      className={`flex-1 p-2 border rounded ${
                        role === "patient"
                          ? "bg-primary text-white"
                          : ""
                      }`}
                    >
                      <Heart className="w-4 h-4 inline mr-1" />
                      Patient
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("doctor")}
                      className={`flex-1 p-2 border rounded ${
                        role === "doctor"
                          ? "bg-primary text-white"
                          : ""
                      }`}
                    >
                      <Stethoscope className="w-4 h-4 inline mr-1" />
                      Doctor
                    </button>

                  </div>
                </div>
              )}

              {/* EMAIL */}
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* PASSWORD */}
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* SUBMIT */}
              <Button className="w-full" disabled={isLoading}>
                {isLoading
                  ? "Please wait..."
                  : isLogin
                  ? "Sign In"
                  : "Create Account"}
              </Button>
            </form>

            {/* TOGGLE */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary"
              >
                {isLogin
                  ? "Don't have an account? Sign up"
                  : "Already have an account? Sign in"}
              </button>
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;