import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUp, Brain, Search } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const PatientDashboard = () => {
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [recordType, setRecordType] = useState("");
  const [description, setDescription] = useState("");

  const token = localStorage.getItem("token");

  // 🔥 FETCH RECORDS
  const fetchRecords = async () => {
    try {
      const res = await fetch(`${BASE_URL}/my-reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

  // 🔥 FETCH REQUESTS
  const fetchRequests = async () => {
    try {
      const res = await fetch(`${BASE_URL}/patient/requests`, {
        headers: { Authorization: `Bearer ${token}` },
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

  // 🔥 APPROVE / REJECT
const handleDecision = async (id, status) => {
  try {
    const res = await fetch(`${BASE_URL}/request-decision/${id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: status, // 🔥 explicitly send
      }),
    });

    const data = await res.json();
    console.log("Response:", data);

    fetchRequests();
  } catch (err) {
    console.log(err);
  }
};
  // 🔥 UPLOAD
  const handleUpload = async () => {
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

      const res = await fetch(`${BASE_URL}/upload-report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error();

      const newRecord = {
        title,
        record_type: recordType,
        created_at: new Date().toISOString(),
        summary: data.preview || {},
      };

      setRecords((prev) => [newRecord, ...prev]);
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
          <div>
            <h1 className="text-2xl font-bold">Patient Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your health records
            </p>
          </div>

          {/* UPLOAD */}
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
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
                className="w-full border p-2 rounded"
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

              <input type="file" onChange={(e) => setFile(e.target.files[0])} />

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
            <TabsTrigger value="summaries">Summaries</TabsTrigger>
          </TabsList>

          {/* RECORDS */}
          <TabsContent value="records">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {filteredRecords.map((r, i) => (
              <Card key={i} className="mt-2">
                <CardContent className="p-4 flex justify-between">
                  <div>
                    <p>{r.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.record_type}
                    </p>
                  </div>
                  <Badge>active</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* 🔥 REQUESTS */}
          <TabsContent value="requests">
            {requests.length === 0 ? (
              <p>No requests</p>
            ) : (
              requests.map((req) => (
                <Card key={req._id} className="mb-2">
                  <CardContent className="p-4 flex justify-between">
                    <div>
                      <p>{req.doctor_email}</p>
                      <p className="text-sm">{req.purpose}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => handleDecision(req._id, "approved")}>
                        Approve
                      </Button>

                      <Button
                        variant="destructive"
                        onClick={() => handleDecision(req._id, "rejected")}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* SUMMARIES */}
          <TabsContent value="summaries">
            {records.map((r, i) => (
              <Card key={i} className="mb-2">
                <CardContent className="p-4">
                  <p>{r.title}</p>
                  <p className="text-sm">{r.summary || "No summary"}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default PatientDashboard;