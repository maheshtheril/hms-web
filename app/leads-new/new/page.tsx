"use client";
import { useForm } from "react-hook-form";

export default function CreateLead() {
  const { register, handleSubmit, reset } = useForm<any>({
    defaultValues: {
      status: "new",
      priority: 3,
      estimated_value: 0,
      probability: 0,
      followup: { enabled: true }
    }
  });

  const onSubmit = async (v: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API}/api/new/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(v)
    });
    const data = await res.json();
    if (data.ok) reset();
    alert(JSON.stringify(data));
  };

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Create Lead (New)</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input className="input" placeholder="Tenant ID (uuid)" {...register("tenant_id")} />
        <input className="input" placeholder="Company ID (uuid)" {...register("company_id")} />
        <input className="input" placeholder="Owner ID (uuid)" {...register("owner_id")} />
        <input className="input" placeholder="Pipeline ID (uuid)" {...register("pipeline_id")} />
        <input className="input" placeholder="Stage ID (uuid)" {...register("stage_id")} />

        <input className="input" placeholder="Name" {...register("name")} />
        <input className="input" placeholder="Primary Email" {...register("primary_email")} />
        <input className="input" placeholder="Primary Phone" {...register("primary_phone")} />

        <input className="input" placeholder="Source ID (uuid)" {...register("source_id")} />
        <input className="input" type="number" placeholder="Estimated Value" {...register("estimated_value")} />
        <input className="input" type="number" placeholder="Probability (%)" {...register("probability")} />
        <input className="input" type="number" placeholder="Priority (1-5)" {...register("priority")} />

        <textarea className="textarea" placeholder='Custom Data JSON' {...register("custom_data")} />
        <input className="input" placeholder="Tags (comma separated)" {...register("tags")} />

        <fieldset className="p-4 border rounded">
          <legend className="font-semibold">Follow-up</legend>
          <input className="input" type="datetime-local" {...register("followup.due_at")} />
          <input className="input" placeholder="Note" {...register("followup.note")} />
        </fieldset>

        <fieldset className="p-4 border rounded">
          <legend className="font-semibold">Lead Note</legend>
          <textarea className="textarea" placeholder="Note body" {...register("note.body")} />
        </fieldset>

        <fieldset className="p-4 border rounded">
          <legend className="font-semibold">Task</legend>
          <input className="input" placeholder="Task title" {...register("task.title")} />
          <input className="input" type="date" {...register("task.due_date")} />
        </fieldset>

        <button className="btn" type="submit">Create</button>
      </form>
    </div>
  );
}
