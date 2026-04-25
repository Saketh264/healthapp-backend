import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // ✅ ADDED
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Brain } from "lucide-react";
import SummaryDialog from "./SummaryDialog";

const API = "http://127.0.0.1:8000";
  
const DoctorDashboard = () => {
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [patientEmail, setPatientEmail] = useState("");
  const [purpose, setPurpose] = useState("");

  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  const token = localStorage.getItem("token");

  // FETCH APPROVED RECORDS
  const fetchRecords = async () => {
    try {
      const res = await fetch(`${API}/doctor/approved-records`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    }
  };

  // FETCH REQUESTS
  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API}/doctor/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchRecords();
      await fetchRequests();
      setLoading(false);
    };
    load();
  }, []);

  // SEND REQUEST
  const handleRequest = async () => {
    if (!patientEmail || !purpose) {
      return alert("Fill all fields");
    }

    try {
      const res = await fetch(`${API}/request-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_email: patientEmail,
          purpose,
        }),
      });

      if (!res.ok) throw new Error();

      alert("Request sent");
      setOpen(false);
      setPatientEmail("");
      setPurpose("");

      fetchRequests();
    } catch {
      alert("Failed");
    }
  };

  // REPORT SUMMARY
  const handleSummary = async (reportId) => {
    try {
      const res = await fetch(`${API}/report-summary/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setSummaryText(data.summary);
      setSummaryOpen(true);
    } catch {
      alert("Failed to load summary");
    }
  };

  // OVERALL SUMMARY
  const handleOverallSummary = async (email) => {
    try {
      const res = await fetch(`${API}/doctor/summarize/${email}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setSummaryText(data.summary);
      setSummaryOpen(true);
    } catch {
      alert("Failed");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">Doctor Dashboard</h1>
            <p className="text-muted-foreground">
              View patient records with consent
            </p>
          </div>

          {/* REQUEST ACCESS */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Send className="mr-2 w-4 h-4" /> Request Access
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Access</DialogTitle>

                {/* ✅ FIXED */}
                <DialogDescription>
                  Enter patient email and reason to request access.
                </DialogDescription>
              </DialogHeader>

              <Input
                placeholder="Patient Email"
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
              />

              <Textarea
                placeholder="Purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />

              <Button onClick={handleRequest}>Send</Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="p-4">Active Consents</CardContent></Card>
          <Card><CardContent className="p-4">{records.length} Records</CardContent></Card>
          <Card><CardContent className="p-4">{requests.length} Requests</CardContent></Card>
          <Card><CardContent className="p-4">{records.length} Summaries</CardContent></Card>
        </div>

        {/* TABS */}
        <Tabs defaultValue="records">

          <TabsList>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
          </TabsList>

          {/* RECORDS */}
          <TabsContent value="records">
            {loading ? (
              <p>Loading...</p>
            ) : records.length === 0 ? (
              <p>No approved records</p>
            ) : (
              records.map((rec) => (
                <Card key={rec._id} className="mb-2">
                  <CardContent className="p-4 flex justify-between items-center">

                    <div>
                      <p className="font-medium">{rec.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {rec.patient_email}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleSummary(rec._id)}>
                        <Brain className="w-4 h-4 mr-1" />
                        Summary
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleOverallSummary(rec.patient_email)}
                      >
                        Overall
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* REQUESTS */}
          <TabsContent value="requests">
            {requests.length === 0 ? (
              <p>No requests</p>
            ) : (
              requests.map((r) => (
                <Card key={r._id} className="mb-2">
                  <CardContent className="p-4">
                    <p>{r.patient_email}</p>
                    <p className="text-sm">{r.purpose}</p>
                    <p className="text-xs">Status: {r.status}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

        </Tabs>

        {/* SUMMARY MODAL */}
        <SummaryDialog
  open={summaryOpen}
  onOpenChange={setSummaryOpen}
  patientLabel="Patient"
  summary={summaryText}
/>

      </main>
    </div>
  );
};

export default DoctorDashboard;