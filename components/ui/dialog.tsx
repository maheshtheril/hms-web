
// components/ui/dialog.tsx
import React from "react";

export const Dialog: React.FC<React.PropsWithChildren<{ open?: boolean, onOpenChange?: (v:boolean)=>void, className?: string }>> = ({ children }) => {
  return <>{children}</>;
};

export const DialogTrigger: React.FC<React.PropsWithChildren<{ asChild?: boolean }>> = ({ children }) => <>{children}</>;

export const DialogContent: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return <div className={className}>{children}</div>;
};

export const DialogHeader: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return <div className={className}>{children}</div>;
};

export const DialogTitle: React.FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className = "" }) => {
  return <h2 className={className}>{children}</h2>;
};
