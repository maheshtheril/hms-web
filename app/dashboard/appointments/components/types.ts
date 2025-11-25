export type CalendarEvent = {
  id: string;
  title: string;
  doctor_id?: string;
  room_id?: string;
  resource_id?: string;
  color?: string;
  start: string; // ISO
  end: string;   // ISO
};

export type Resource = {
  id: string;
  name: string;
  type: string; // doctor | room | equipment
};
