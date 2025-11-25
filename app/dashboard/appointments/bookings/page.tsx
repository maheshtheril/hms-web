"use client";
import TableCard from "@/app/dashboard/components/TableCard";
import AppointmentRoleGuard from "../AppointmentRoleGuard";

export default function BookingsList() {
  return (
    <AppointmentRoleGuard>
      <TableCard title="Bookings" columns={["Appt ID","Patient","Doctor","Room","Start","End","Status"]}/>
    </AppointmentRoleGuard>
  );
}
