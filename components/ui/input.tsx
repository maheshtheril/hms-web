// components/ui/input.tsx
import React, { forwardRef } from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
  // any other custom props you used elsewhere can stay here
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  const {
    className = "",
    type = "text",
    onChange,
    ...rest
  } = props;

  // IMPORTANT: don't force pointer-events, appearance, or remove native date pickers here.
  // Keep the input element as native as possible and only apply classes for visual style.
  return (
    <input
      {...(rest as any)}
      ref={ref}
      type={type}
      onChange={onChange}
      className={className}
    />
  );
});

Input.displayName = "Input";

export default Input;
