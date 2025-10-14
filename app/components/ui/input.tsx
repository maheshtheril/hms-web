"use client";

import * as React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export default function Input(props: Props) {
  const autoId = React.useId(); // stable per mount
  const id = props.id ?? `in_${autoId}`;
  const name = props.name ?? id;

  // Accessible fallback label to silence "no label" when consumer forgets
  const ariaLabel =
    (props as any)["aria-label"] ??
    (props.placeholder ? String(props.placeholder) : name);

  const { className = "", ...rest } = props;

  return (
    <input
      {...rest}
      id={id}
      name={name}
      aria-label={ariaLabel}
      className={`w-full rounded-2xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-white/20 ${className}`}
    />
  );
}
