import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Building2,
  Pill,
  Stethoscope,
  ClipboardCheck,
  Brain,
  Sparkles,
} from "lucide-react";

const SECTION_META = {
  "patient details": { title: "Patient Details", icon: <User className="w-4 h-4" /> },
  patient: { title: "Patient Details", icon: <User className="w-4 h-4" /> },
  hospital: { title: "Hospital", icon: <Building2 className="w-4 h-4" /> },
  medications: { title: "Medications", icon: <Pill className="w-4 h-4" /> },
  doctor: { title: "Doctor", icon: <Stethoscope className="w-4 h-4" /> },
  advice: { title: "Advice", icon: <ClipboardCheck className="w-4 h-4" /> },
};

function parseSummary(text) {
  if (!text) return [];

  const lines = text.split("\n");
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();
    if (!line) continue;
    if (/^-{3,}$/.test(line)) continue;

    const next = (lines[i + 1] || "").trim();
    const isHeading =
      /^[A-Za-z][A-Za-z\s]{1,30}$/.test(line) && /^-{3,}$/.test(next);

    const lower = line.toLowerCase();

    if (isHeading && SECTION_META[lower]) {
      const meta = SECTION_META[lower];
      current = {
        key: lower,
        title: meta.title,
        icon: meta.icon,
        body: [],
      };
      sections.push(current);
      continue;
    }

    if (current) {
      current.body.push(line);
    } else {
      current = {
        key: "overview",
        title: "Overview",
        icon: <Sparkles className="w-4 h-4" />,
        body: [line],
      };
      sections.push(current);
    }
  }

  return sections;
}

function renderLine(line, idx) {
  if (/^[•\-*]\s+/.test(line)) {
    const content = line.replace(/^[•\-*]\s+/, "");
    return (
      <li key={idx} className="flex gap-3 text-sm leading-relaxed">
        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
        <span>{content}</span>
      </li>
    );
  }

  const m = line.match(/^([A-Za-z][A-Za-z\s\-\/]{0,30}):\s*(.*)$/);

  if (m) {
    const key = m[1].trim();
    const value = m[2].trim();

    const missing =
      !value || /^not available$/i.test(value) || /^n\/?a$/i.test(value);

    return (
      <div key={idx} className="flex flex-col sm:flex-row gap-2 py-1.5">
        <span className="text-xs uppercase text-muted-foreground sm:w-32">
          {key}
        </span>
        <span className={missing ? "italic text-muted-foreground" : "font-medium"}>
          {missing ? "Not available" : value}
        </span>
      </div>
    );
  }

  return (
    <p key={idx} className="text-sm leading-relaxed">
      {line}
    </p>
  );
}

const SummaryDialog = ({ open, onOpenChange, patientLabel, summary }) => {
  const sections = parseSummary(summary);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">

        {/* HEADER */}
        <div className="bg-gradient-to-br from-primary to-secondary px-6 py-5 text-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5" />
              <div>
                <DialogTitle>AI Medical Summary</DialogTitle>
                <DialogDescription className="text-sm text-white/80">
                  {patientLabel
                    ? `Summary for ${patientLabel}`
                    : "AI-generated summary"}
                </DialogDescription>
              </div>
              <Badge className="ml-auto">
                <Sparkles className="w-3 h-3 mr-1" />
                AI
              </Badge>
            </div>
          </DialogHeader>
        </div>

        {/* BODY */}
        <div className="max-h-[65vh] overflow-y-auto p-6 space-y-4">
          {sections.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No summary available
            </p>
          ) : (
            sections.map((section, i) => (
              <div key={i} className="border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  {section.icon}
                  <h3 className="font-semibold text-sm uppercase">
                    {section.title}
                  </h3>
                </div>

                <Separator className="mb-2" />

                {section.key === "medications" ? (
                  <ul className="space-y-2">
                    {section.body.map((l, j) => renderLine(l, j))}
                  </ul>
                ) : (
                  <div>
                    {section.body.map((l, j) => renderLine(l, j))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* FOOTER */}
        <div className="border-t p-3 text-xs text-muted-foreground">
          AI-generated summary — verify with original report.
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default SummaryDialog;