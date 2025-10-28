// web/app/hms/patients/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import { fetchPatients, deletePatient } from "./hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Minimal Neural Glass-styled UI primitives inline for demo
function Button({ children, ...rest }: any) {
  return <button {...rest} className="px-3 py-2 rounded-md shadow-sm border bg-white hover:scale-[1.01]">{children}</button>;
}

export default function PatientsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function load() {
    setLoading(true);
    try {
      const { rows } = await fetchPatients({ q, limit: 50 });
      setRows(rows || []);
    } catch (err) {
      console.error("fetch patients failed", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onDelete(id: string) {
    if (!confirm("Delete patient? (soft-delete)")) return;
    await deletePatient(id);
    await load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Patients</h1>
        <div className="flex gap-2">
          <Link href="/hms/patients/new"><Button>+ New Patient</Button></Link>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <input placeholder="Search by name, patient number, phone..." value={q} onChange={(e) => setQ(e.target.value)} className="border p-2 rounded w-80" />
        <Button onClick={() => load()}>Search</Button>
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">Patient #</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">DOB</th>
              <th className="p-2 text-left">Gender</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="p-4">No patients found</td></tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="odd:bg-white even:bg-slate-50">
                  <td className="p-2">{r.patient_number}</td>
                  <td className="p-2">{r.first_name} {r.last_name}</td>
                  <td className="p-2">{r.dob ? new Date(r.dob).toLocaleDateString() : "-"}</td>
                  <td className="p-2">{r.gender || "-"}</td>
                  <td className="p-2">{r.status}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <Link href={`/hms/patients/${r.id}`}><Button>View</Button></Link>
                      <Link href={`/hms/patients/${r.id}/edit`}><Button>Edit</Button></Link>
                      <Button onClick={() => onDelete(r.id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
