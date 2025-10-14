"use client";
import * as React from "react";

type Props = {
  id?: string;
  name?: string;
  label: string;
  hideLabel?: boolean; // visually hidden but still accessible
  children: React.ReactElement<any>; // accept input/textarea/select or custom components
};

export default function FormField({ id, name, label, hideLabel, children }: Props) {
  const autoId = React.useId();
  const fieldId = id ?? `fld_${autoId}`;
  const fieldName = name ?? (children.props?.name ?? fieldId);

  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        id: fieldId,
        name: fieldName,
      } as any)
    : children;

  return (
    <div className="space-y-1">
      <label htmlFor={fieldId} className={hideLabel ? "sr-only" : "block text-sm font-medium"}>
        {label}
      </label>
      {child}
    </div>
  );
}
