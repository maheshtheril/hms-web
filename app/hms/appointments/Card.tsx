import React from "react";
import { motion } from "framer-motion";
import { Calendar, User } from "lucide-react";
import Link from "next/link";

export default function AppointmentCard({ a }: { a: any }) {
  return (
    <motion.div
      className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 hover:bg-white/20 transition flex flex-col gap-2"
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <User size={18} />
          <span className="font-semibold">{a.patient_name}</span>
        </div>
        <span className="text-xs text-gray-300">{a.status}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-300">
        <Calendar size={16} />
        <span>
          {new Date(a.start_time).toLocaleString()} →{" "}
          {new Date(a.end_time).toLocaleTimeString()}
        </span>
      </div>
      <Link
        href={`/hms/appointments/${a.id}`}
        className="text-sm mt-2 text-blue-300 hover:text-blue-200 transition"
      >
        View Details →
      </Link>
    </motion.div>
  );
}
