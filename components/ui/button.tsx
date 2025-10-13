import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: false;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", ...props }, ref) => (
    <button
      ref={ref}
      className={
        "inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium " +
        "border border-transparent bg-black text-white hover:opacity-90 disabled:opacity-50 " +
        className
      }
      {...props}
    />
  )
);
Button.displayName = "Button";

export default Button;
