"use client";
import React, { useState } from "react";
import apiClient from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Check, X } from "lucide-react";

export default function AppointmentForm() {
  const [form, setForm] = useState({
    patient_id: "",
    clinician_id: "",
    start_time: "",
    end_time: "",
    status: "scheduled",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await apiClient.post("/hms/appointments", form);
    setLoading(false);
    router.push("/hms/appointments");
  };

  return (
    <motion.form
      onSubmit={submit}
      className="max-w-xl mx-auto p-8 bg-white/10 rounded-3xl backdrop-blur-lg space-y-5"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-2xl font-semibold mb-4">New Appointment</h2>
      {["patient_id", "clinician_id", "start_time", "end_time"].map((field) => (
        <input
          key={field}
          type={field.includes("time") ? "datetime-local" : "text"}
          placeholder={field.replace("_", " ").toUpperCase()}
          value={(form as any)[field]}
          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
          className="w-full bg-white/5 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
          required
        />
      ))}

      <textarea
        placeholder="Notes"
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        className="w-full bg-white/5 px-4 py-3 rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white/20 hover:bg-white/30 py-3 rounded-xl flex justify-center items-center gap-2 transition"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Check />} Save Appointment
      </button>
    </motion.form>
  );
}
