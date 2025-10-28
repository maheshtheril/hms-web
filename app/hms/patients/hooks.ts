// web/app/hms/patients/hooks.ts
"use client";
import API from "@/lib/api-client";

export async function fetchPatients({ q, status, limit = 50, offset = 0 }: { q?: string; status?: string; limit?: number; offset?: number }) {
  const params: any = { limit, offset };
  if (q) params.q = q;
  if (status) params.status = status;
  const { data } = await API.get("/hms/patients", { params });
  return data;
}

export async function fetchPatient(id: string) {
  const { data } = await API.get(`/hms/patients/${id}`);
  return data.patient;
}

export async function createPatient(payload: any) {
  const { data } = await API.post("/hms/patients", payload);
  return data.patient;
}

export async function updatePatient(id: string, payload: any) {
  const { data } = await API.put(`/hms/patients/${id}`, payload);
  return data.patient;
}

export async function patchPatient(id: string, payload: any) {
  const { data } = await API.patch(`/hms/patients/${id}`, payload);
  return data.patient;
}

export async function deletePatient(id: string, opts?: { merged_into?: string }) {
  const { data } = await API.delete(`/hms/patients/${id}`, { data: opts || {} });
  return data;
}

export async function generateAiSummary(id: string) {
  const { data } = await API.post(`/hms/patients/${id}/ai/summary`);
  return data.summary;
}
