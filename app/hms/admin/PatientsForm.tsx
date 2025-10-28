"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function PatientsForm({ patient }: { patient?: any }) {
  const router = useRouter();
  const { register, handleSubmit } = useForm({
    defaultValues: patient || {},
  });

  const onSubmit = async (values: any) => {
    const url = patient
      ? `/api/hms/patients/${patient.id}`
      : "/api/hms/patients";
    const method = patient ? "PUT" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    router.push("/hms/patients");
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-3xl mx-auto bg-white/10 border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-xl space-y-6 text-white"
    >
      <h1 className="text-2xl font-semibold">
        {patient ? "Edit Patient" : "New Patient"}
      </h1>

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label className="text-sm text-white/70">First Name</label>
          <input
            {...register("first_name", { required: true })}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div>
          <label className="text-sm text-white/70">Last Name</label>
          <input
            {...register("last_name")}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div>
          <label className="text-sm text-white/70">Date of Birth</label>
          <input
            type="date"
            {...register("dob")}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/20"
          />
        </div>
        <div>
          <label className="text-sm text-white/70">Gender</label>
          <select
            {...register("gender")}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/20"
          >
            <option value="">Select</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-white/70">Patient Number</label>
          <input
            {...register("patient_number")}
            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-white/20"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full rounded-2xl py-3 bg-white/20 hover:bg-white/30 text-white"
      >
        Save
      </Button>
    </form>
  );
}
