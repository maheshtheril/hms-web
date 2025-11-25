"use client";

import React from "react";

interface TitleProps {
  title?: string | React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Generic component with a typed `title` prop.
 * Use for any UI element that needs a titled container.
 */
export default function TitleWrapper({ title, children }: TitleProps) {
  return (
    <div className="space-y-3">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      <div>{children}</div>
    </div>
  );
}
