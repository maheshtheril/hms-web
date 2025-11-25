"use client";

import React from "react";

interface PatientRoleGuardProps {
  user: {
    role: string;
    [key: string]: any;
  };
  children: React.ReactNode;
}

export default function PatientRoleGuard({ user, children }: PatientRoleGuardProps) {
  const allowed = ["admin", "doctor", "nurse", "lab_staff", "imaging_staff"];

  if (!allowed.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center text-red-500 text-lg">
        Unauthorized – EMR Access Restricted
      </div>
    );
  }

  return <>{children}</>;
}
