"use client";
import ResourceList from "../components/ResourceList";
import AppointmentRoleGuard from "../AppointmentRoleGuard";

export default function RoomsPage() {
  const sample = [{id:"r1",name:"XR Room 1",type:"XR",location:"Floor 2",status:"online"}];
  return (
    <AppointmentRoleGuard>
      <h2 className="text-xl font-semibold mb-4">Rooms & Equipment</h2>
      <ResourceList resources={sample} />
    </AppointmentRoleGuard>
  );
}
