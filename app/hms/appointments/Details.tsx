"use client";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";

export default function AppointmentDetails() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    apiClient.get(`/hms/appointments/${id}`).then((res) => setData(res.data));
  }, [id]);

  if (!data) return <p className="text-center mt-12 text-gray-400">Loading...</p>;

  return (
    <motion.div
      className="p-8 bg-white/10 backdrop-blur-lg rounded-3xl text-white max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h2 className="text-3xl font-semibold mb-6">{data.patient_name}</h2>
      <div className="flex flex-col gap-3 text-gray-200">
        <div className="flex items-center gap-2">
          <Calendar size={18} /> {new Date(data.start_time).toLocaleString()}
        </div>
        <div className="flex items-center gap-2">
          <Clock size={18} /> {data.status}
        </div>
        <p className="mt-4 text-gray-300">{data.notes || "No notes"}</p>
      </div>
    </motion.div>
  );
}
