// components/ui/dropdown-menu.tsx
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { ChevronRight, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const {
  Root,
  Trigger,
  Content,
  Item,
  Portal,
  Group,
  Label,
  Separator,
  Sub,
  SubTrigger,
  SubContent,
  CheckboxItem,
  RadioItem,
  ItemIndicator,
  RadioGroup,
} = DropdownMenuPrimitive

export const DropdownMenu = Root
export const DropdownMenuTrigger = Trigger

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof Content>,
  React.ComponentPropsWithoutRef<typeof Content> & { sideOffset?: number }
>(({ className, sideOffset = 4, ...props }, ref) => (
  <Portal>
    <Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[10rem] rounded-xl border bg-white/80 p-1 shadow-md backdrop-blur",
        className
      )}
      {...props}
    />
  </Portal>
))
DropdownMenuContent.displayName = "DropdownMenuContent"

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof Item>,
  React.ComponentPropsWithoutRef<typeof Item>
>(({ className, children, ...props }, ref) => (
  <Item
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-sm outline-none hover:bg-slate-100",
      className
    )}
    {...props}
  >
    {children}
  </Item>
))
DropdownMenuItem.displayName = "DropdownMenuItem"

export const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, children, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn("px-2 py-1 text-xs font-semibold uppercase text-slate-500", className)}
    {...props}
  >
    {children}
  </Label>
))
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export const DropdownMenuSeparator = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Separator>) => (
  <Separator className={cn("my-1 h-px bg-slate-200", className)} {...props} />
)

export const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof SubTrigger>,
  React.ComponentPropsWithoutRef<typeof SubTrigger>
>(({ className, children, ...props }, ref) => (
  <SubTrigger
    ref={ref}
    className={cn("flex items-center justify-between px-2 py-1.5 text-sm hover:bg-slate-100", className)}
    {...props}
  >
    {children}
    <ChevronRight className="ml-2 h-4 w-4" />
  </SubTrigger>
))
DropdownMenuSubTrigger.displayName = "DropdownMenuSubTrigger"

export const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof SubContent>,
  React.ComponentPropsWithoutRef<typeof SubContent>
>(({ className, ...props }, ref) => (
  <SubContent ref={ref} className={cn("min-w-[8rem] rounded-xl border bg-white/80 p-1 shadow", className)} {...props} />
))
DropdownMenuSubContent.displayName = "DropdownMenuSubContent"

export const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof CheckboxItem>
>(({ children, className, ...props }, ref) => (
  <CheckboxItem ref={ref} className={cn("relative flex items-center pl-8 pr-2 py-1.5 text-sm", className)} {...props}>
    <span className="absolute left-2">
      <ItemIndicator>
        <Check className="h-4 w-4" />
      </ItemIndicator>
    </span>
    {children}
  </CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = "DropdownMenuCheckboxItem"

export const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof RadioItem>,
  React.ComponentPropsWithoutRef<typeof RadioItem>
>(({ children, className, ...props }, ref) => {
  // IMPORTANT: props must include `value` when using RadioItem — Radix requires it.
  return (
    <RadioItem ref={ref} className={cn("relative flex items-center pl-8 pr-2 py-1.5 text-sm", className)} {...props}>
      <span className="absolute left-2">
        <ItemIndicator>
          <Check className="h-3 w-3" />
        </ItemIndicator>
      </span>
      {children}
    </RadioItem>
  )
})
DropdownMenuRadioItem.displayName = "DropdownMenuRadioItem"

export const DropdownMenuGroup = Group
export const DropdownMenuPortal = Portal
export const DropdownMenuSub = Sub
export const DropdownMenuRadioGroup = RadioGroup
