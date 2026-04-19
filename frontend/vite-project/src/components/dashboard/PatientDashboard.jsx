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
import { FileUp } from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const PatientDashboard = () => {
  const [records, setRecords] = useState([]);
  const [requests, setRequests] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [file, setFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [recordType, setRecordType] = useState("");
  const [description, setDescription] = useState("");

  const token = localStorage.getItem("token");

  // FETCH RECORDS
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

  // FETCH REQUESTS
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

  // APPROVE / REJECT
  const handleDecision = async (id, status) => {
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

  // UPLOAD
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

      await fetch(`${BASE_URL}/upload-report`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      await fetchRecords(); // 🔥 IMPORTANT FIX

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
          <h1 className="text-2xl font-bold">Patient Dashboard</h1>

          {/* UPLOAD */}
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

              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

              <select value={recordType} onChange={(e) => setRecordType(e.target.value)}>
                <option value="">Select</option>
                <option value="lab_report">Lab Report</option>
                <option value="prescription">Prescription</option>
              </select>

              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />

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

                    {/* 🔥 SHOW SUMMARY */}
                    {r.readable_summary && (
                      <pre className="text-xs mt-2 whitespace-pre-wrap text-muted-foreground">
                        {r.readable_summary}
                      </pre>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRecord(r);
                        setViewOpen(true);
                      }}
                    >
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

                    {req.status === "approved" && (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                        Approved
                      </span>
                    )}

                    {req.status === "rejected" && (
                      <span className="px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm">
                        Rejected
                      </span>
                    )}

                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

        </Tabs>

        {/* VIEW MODAL */}
        <Dialog open={viewOpen} onOpenChange={setViewOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
            </DialogHeader>

            {selectedRecord && (
              <div className="space-y-4">

                {selectedRecord.file_path && (
                  <div className="max-h-[80vh] overflow-y-auto">
                    <img
                      src={`${BASE_URL}/${selectedRecord.file_path}`}
                      alt="report"
                      className="w-full object-contain rounded-md border"
                    />
                  </div>
                )}

              </div>
            )}
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
};

export default PatientDashboard;