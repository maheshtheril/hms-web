// /app/dashboard/emr/patient/[id]/timeline/page.tsx
"use client";

import TimelineCard from "../../../../components/TimelineCard";

export default function PatientTimeline() {
  return (
    <TimelineCard
      title="Patient Timeline"
      events={[
        { type: "visit", label: "OPD Consultation", date: "2025-01-12" },
        { type: "lab", label: "CBC Test", date: "2025-01-13" },
        { type: "rx", label: "Medication Updated", date: "2025-01-15" },
        { type: "imaging", label: "Chest X-Ray", date: "2025-01-20" },
      ]}
    />
  );
}
