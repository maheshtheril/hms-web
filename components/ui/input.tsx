import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => (
    <input
      ref={ref}
      className={
        "flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm " +
        "outline-none ring-0 focus:border-black " + className
      }
      {...props}
    />
  )
);
Input.displayName = "Input";

export default Input;
