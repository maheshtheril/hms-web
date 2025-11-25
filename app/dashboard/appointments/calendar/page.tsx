"use client";
import CalendarView from "../components/CalendarView";
import AppointmentRoleGuard from "../AppointmentRoleGuard";

export default function AppCalendarPage() {
  return (
    <AppointmentRoleGuard>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Clinic Calendar</h1>
        <CalendarView initialView="month" companyId={undefined} />
      </div>
    </AppointmentRoleGuard>
  );
}
