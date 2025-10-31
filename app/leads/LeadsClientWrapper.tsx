"use client";

import React from "react";
import LeadsClient from "./LeadsClient"; // ensure LeadsClient.tsx itself has "use client" too if it uses hooks

export default function LeadsClientWrapper() {
  return <LeadsClient />;
}
