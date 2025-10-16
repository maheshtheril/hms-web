// web/components/PasswordField.tsx
import React, { useId, useState } from "react";

export default function PasswordField({
  value,
  onChange,
  placeholder = "Password",
  showStrength = false,
  strength = 0,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  strength?: number;
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder={placeholder}
          type={show ? "text" : "password"}
          className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/40"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-2 my-auto h-7 w-7 rounded-md bg-white/8 text-white/90 hover:bg-white/12"
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>

      {showStrength && (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-white/6 overflow-hidden">
            <div
              className={`h-full transition-all ${strength <= 1 ? "w-1/4 bg-red-500/80" : strength === 2 ? "w-2/4 bg-yellow-500/80" : strength === 3 ? "w-3/4 bg-lime-500/80" : "w-full bg-emerald-500/90"}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
