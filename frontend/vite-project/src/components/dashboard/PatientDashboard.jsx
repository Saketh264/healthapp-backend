import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import { FileUp } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const PatientDashboard = () => {
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [recordType, setRecordType] = useState("");
  const [description, setDescription] = useState("");

  // ✅ ALWAYS GET FRESH TOKEN
  const getToken = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found. Please login again.");
      return null;
    }
    return token;
  };

  // ---------------- FETCH RECORDS ----------------
  const fetchRecords = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/my-reports`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

  // ---------------- FETCH REQUESTS ----------------
  const fetchRequests = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/patient/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchRequests();
  }, []);

  // ---------------- VIEW REPORT ----------------
  const handleView = async (id) => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${BASE_URL}/report/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setSelectedRecord(data);
      setViewOpen(true);
    } catch {
      alert("Failed to load report");
    }
  };

  // ---------------- APPROVE / REJECT ----------------
  const handleDecision = async (id, status) => {
    const token = getToken();
    if (!token) return;

    try {
      await fetch(`${BASE_URL}/request-decision/${id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      fetchRequests();
    } catch {
      alert("Action failed");
    }
  };

  // ---------------- UPLOAD ----------------
  const handleUpload = async () => {
    const token = getToken();
    if (!token) return;

    if (!file || !title || !recordType) {
      return alert("Fill all required fields");
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("record_type", recordType);
      formData.append("description", description);

      await fetch(`${BASE_URL}/upload-report`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      await fetchRecords();

      setUploadOpen(false);
      setFile(null);
      setTitle("");
      setRecordType("");
      setDescription("");
    } catch {
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- FILTER ----------------
  const filteredRecords = records.filter(
    (r) =>
      r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.record_type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto p-6 space-y-6">

        {/* HEADER */}
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold">Patient Dashboard</h1>

          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button>
                <FileUp className="w-4 h-4 mr-2" /> Upload
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Record</DialogTitle>
              </DialogHeader>

              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <select
                value={recordType}
                onChange={(e) => setRecordType(e.target.value)}
              >
                <option value="">Select</option>
                <option value="lab_report">Lab Report</option>
                <option value="prescription">Prescription</option>
              </select>

              <Textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
              />

              <Button onClick={handleUpload}>
                {loading ? "Uploading..." : "Upload"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {/* TABS */}
        <Tabs defaultValue="records">

          <TabsList>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
          </TabsList>

          {/* RECORDS */}
          <TabsContent value="records">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {filteredRecords.map((r) => (
              <Card key={r._id} className="mt-2">
                <CardContent className="p-4 flex justify-between items-center">

                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{r.record_type}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleView(r._id)}>
                      View
                    </Button>
                    <Badge>active</Badge>
                  </div>

                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* REQUESTS */}
          <TabsContent value="requests">
            {requests.map((req) => (
              <Card key={req._id} className="mb-2">
                <CardContent className="p-4 flex justify-between">

                  <div>
                    <p>{req.doctor_email}</p>
                    <p className="text-sm">{req.purpose}</p>
                  </div>

                  <div className="flex gap-2 items-center">
                    {req.status === "pending" && (
                      <>
                        <Button onClick={() => handleDecision(req._id, "approved")}>
                          Approve
                        </Button>

                        <Button
                          variant="destructive"
                          onClick={() => handleDecision(req._id, "rejected")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>

                </CardContent>
              </Card>
            ))}
          </TabsContent>

        </Tabs>

        {/* VIEW MODAL */}
        

<Dialog open={viewOpen} onOpenChange={setViewOpen}>
  <DialogContent className="max-w-4xl p-0 overflow-hidden">

    {/* HEADER */}
    <div className="bg-gradient-to-br from-primary to-secondary px-6 py-5 text-white">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            📄
          </div>

          <div>
            <DialogTitle className="text-white">
              {selectedRecord?.title || "Medical Report"}
            </DialogTitle>

            <DialogDescription className="text-white/80 text-sm">
              Scroll & zoom to view
            </DialogDescription>
          </div>

          {/* 🔥 ZOOM CONTROLS */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="bg-white/20 p-2 rounded hover:bg-white/30"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
              className="bg-white/20 p-2 rounded hover:bg-white/30"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setZoom(1)}
              className="bg-white/20 p-2 rounded hover:bg-white/30"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </DialogHeader>
    </div>

    {/* IMAGE VIEW */}
    <div className="max-h-[75vh] overflow-auto bg-muted flex justify-center items-start p-6">
      {selectedRecord?.file_url ? (
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            transition: "transform 0.2s ease",
          }}
        >
          <img
            src={selectedRecord.file_url}
            alt="report"
            className="max-w-full rounded-lg border shadow"
          />
        </div>
      ) : (
        <p className="text-muted-foreground">No preview available</p>
      )}
    </div>

    {/* FOOTER */}
    <div className="border-t p-3 text-xs text-muted-foreground text-center">
      Use controls to zoom • Scroll to navigate
    </div>

  </DialogContent>
</Dialog>

      </main>
    </div>
  );
};

export default PatientDashboard;