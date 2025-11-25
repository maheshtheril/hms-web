// /app/dashboard/hr/schedule/page.tsx
"use client";

import AdvancedCalendar from "../../appointments/components/AdvancedCalendar";

export default function StaffScheduling() {
  return (
    <AdvancedCalendar
      events={[]}
      resources={[
        { id: "n1", name: "Nurse A", type: "staff" },
        { id: "n2", name: "Nurse B", type: "staff" },
        { id: "d1", name: "Dr. Smith", type: "doctor" },
      ]}
      onCreate={(e) => console.log("SHIFT CREATED", e)}
      onMove={(id, e) => console.log("SHIFT MOVED", id, e)}
      onResize={(id, e) => console.log("SHIFT RESIZED", id, e)}
    />
  );
}
