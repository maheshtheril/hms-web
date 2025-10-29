// web/app/hms/patients/hooks.ts
"use client";
import API from "@/lib/api-client";

/* -------------------------------------------------------------------------- */
/*                                 PATIENTS API                               */
/* -------------------------------------------------------------------------- */

/** Fetch list of patients (with optional search + pagination). */
export async function fetchPatients({
  q,
  status,
  limit = 50,
  offset = 0,
}: {
  q?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params: any = { limit, offset };
  if (q) params.q = q;
  if (status) params.status = status;

  const { data } = await API.get("/hms/patients", { params });
  return data; // expected { rows, total, ... }
}

/** Fetch single patient by ID. */
export async function fetchPatient(id: string) {
  const { data } = await API.get(`/hms/patients/${id}`);
  return data.patient;
}

/** Create a new patient record. */
export async function createPatient(payload: any) {
  const { data } = await API.post("/hms/patients", payload);
  return data.patient;
}

/** Update patient fully (PUT). */
export async function updatePatient(id: string, payload: any) {
  const { data } = await API.put(`/hms/patients/${id}`, payload);
  return data.patient;
}

/** Partial update (PATCH). */
export async function patchPatient(id: string, payload: any) {
  const { data } = await API.patch(`/hms/patients/${id}`, payload);
  return data.patient;
}

/** Delete patient (soft-delete supported). */
export async function deletePatient(id: string, opts?: { merged_into?: string }) {
  const { data } = await API.delete(`/hms/patients/${id}`, { data: opts || {} });
  return data;
}

/** Generate AI summary for a given patient. */
export async function generateAiSummary(id: string) {
  const { data } = await API.post(`/hms/patients/${id}/ai/summary`);
  return data.summary;
}

/* -------------------------------------------------------------------------- */
/*                               ENCOUNTERS API                               */
/* -------------------------------------------------------------------------- */

/**
 * Fetch encounters linked to a specific patient.
 * Returns { rows, hasMore } or array fallback.
 */
export async function fetchEncounters(
  patientId: string,
  opts: { page?: number; pageSize?: number; signal?: AbortSignal } = {}
) {
  const { page = 0, pageSize = 10, signal } = opts;
  const params = { page, page_size: pageSize };

  try {
    const { data } = await API.get(`/hms/patients/${patientId}/encounters`, {
      params,
      signal,
    });

    // Allow either { rows, hasMore } or plain array responses.
    if (Array.isArray(data)) {
      return { rows: data, hasMore: data.length === pageSize };
    }

    if (data && typeof data === "object" && "rows" in data) {
      return data;
    }

    return { rows: [], hasMore: false };
  } catch (err) {
    console.error("fetchEncounters failed", err);
    throw err;
  }
}

/**
 * Delete a single encounter record.
 */
export async function deleteEncounter(encounterId: string) {
  try {
    const { data } = await API.delete(`/hms/encounters/${encounterId}`);
    return data;
  } catch (err) {
    console.error("deleteEncounter failed", err);
    throw err;
  }
}
