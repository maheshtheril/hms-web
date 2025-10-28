"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/hms/patients")
      .then((r) => r.json())
      .then(setPatients)
      .finally(() => setLoading(false));
  }, []);

  const filtered = patients.filter((p) =>
    `${p.first_name} ${p.last_name ?? ""}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <motion.div
      className="min-h-screen p-10 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-semibold flex items-center gap-2">
          <User className="w-6 h-6" /> Patients
        </h1>
        <Link href="/hms/admin/patients/new">
          <Button className="rounded-2xl px-5 py-2 bg-white/10 hover:bg-white/20 text-white shadow-lg backdrop-blur-xl">
            <Plus className="w-4 h-4 mr-2" /> Add Patient
          </Button>
        </Link>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-3 text-white/40" />
        <input
          className="w-full bg-white/10 border border-white/10 rounded-2xl pl-10 pr-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
          placeholder="Search patients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-white/50">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-white/50">No patients found.</p>
      ) : (
        <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-6">
          {filtered.map((p) => (
            <motion.div
              key={p.id}
              whileHover={{ scale: 1.02 }}
              className="p-6 bg-white/10 border border-white/10 rounded-3xl shadow-lg backdrop-blur-lg transition-all"
            >
              <h2 className="text-lg font-semibold">
                {p.first_name} {p.last_name}
              </h2>
              <p className="text-sm text-white/70 mt-1">
                {p.gender || "—"} • {p.dob || "Unknown"}
              </p>
              <p className="text-xs text-white/40 mt-1">
                Patient #: {p.patient_number || "N/A"}
              </p>
              <Link
                href={`/hms/admin/patients/${p.id}`}
                className="mt-4 inline-block text-sm text-white/90 underline hover:text-white"
              >
                View / Edit
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
