"use client";

import React from "react";
import JournalForm from "../components/JournalForm";

export default function JournalsPage() {
  const handleSubmit = async (payload: any) => {
    const res = await fetch("/api/finance/journals", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed");
    alert("Posted");
  };

  return <JournalForm onSubmit={handleSubmit} />;
}
