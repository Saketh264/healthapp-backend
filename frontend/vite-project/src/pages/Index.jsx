import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, FileText, Users, Brain, ArrowRight, Heart, Lock } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: FileText,
      title: 'Health Records',
      description: 'Upload and manage prescriptions, lab reports, scans, and doctor notes in one secure place.'
    },
    {
      icon: Lock,
      title: 'Consent-Based Access',
      description: 'Control who sees your medical data. Grant or revoke access to doctors anytime.'
    },
    {
      icon: Brain,
      title: 'AI Summarization',
      description: 'Get intelligent summaries of medical records to speed up clinical decision-making.'
    },
    {
      icon: Users,
      title: 'Role-Based Access',
      description: 'Separate dashboards for patients and doctors with secure role-based authentication.'
    },
  ];

  // ✅ Auto redirect if already logged in
  const handleStart = () => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">HealthVault</span>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleStart}>
              Sign In
            </Button>
            <Button onClick={handleStart}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main>
        <section className="py-20 md:py-32 px-4">
          <div className="container mx-auto text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-accent px-4 py-2 rounded-full text-sm mb-6">
              <Heart className="w-4 h-4" /> Secure & Patient-Centric
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Unified Health Record <span className="text-primary">Management System</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8">
              A secure platform for managing patient medical records with consent-based access control and AI-powered clinical summarization.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={handleStart}>
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button size="lg" variant="outline" onClick={handleStart}>
                Sign In as Doctor
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 bg-muted/50 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl p-6 border">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>

                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

            <div className="space-y-8">
              {[
                { step: '1', title: 'Create Your Account', desc: 'Sign up as a Patient or Doctor.' },
                { step: '2', title: 'Upload Medical Records', desc: 'Upload prescriptions, lab reports, and scans.' },
                { step: '3', title: 'Manage Consent', desc: 'Control which doctors can access your records.' },
                { step: '4', title: 'AI-Powered Insights', desc: 'Get AI-generated summaries.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © 2026 HealthVault
      </footer>

    </div>
  );
};

export default Index;