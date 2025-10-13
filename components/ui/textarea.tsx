import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", ...props }, ref) => (
    <textarea
      ref={ref}
      className={
        "w-full min-h-[90px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm " +
        "outline-none ring-0 focus:border-black " + className
      }
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export default Textarea;
