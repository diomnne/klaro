"use client"

import type * as React from "react"

import { NumberField as NumberFieldPrimitive } from "@base-ui/react/number-field"
import { MinusIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function NumberField({ className, ...props }: NumberFieldPrimitive.Root.Props) {
  return (
    <NumberFieldPrimitive.Root
      data-slot="number-field"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function NumberFieldGroup({ className, ...props }: NumberFieldPrimitive.Group.Props) {
  return (
    <NumberFieldPrimitive.Group
      data-slot="number-field-group"
      className={cn("flex h-8 items-stretch", className)}
      {...props}
    />
  )
}

const stepperClasses =
  "flex w-8 items-center justify-center rounded-lg border border-input bg-transparent text-muted-foreground outline-none select-none hover:not-data-disabled:bg-accent disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-3.5"

function NumberFieldDecrement({
  className,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Decrement>) {
  return (
    <NumberFieldPrimitive.Decrement
      data-slot="number-field-decrement"
      className={cn(stepperClasses, "rounded-r-none border-r-0", className)}
      {...props}
    >
      <MinusIcon />
    </NumberFieldPrimitive.Decrement>
  )
}

function NumberFieldIncrement({
  className,
  ...props
}: React.ComponentProps<typeof NumberFieldPrimitive.Increment>) {
  return (
    <NumberFieldPrimitive.Increment
      data-slot="number-field-increment"
      className={cn(stepperClasses, "rounded-l-none border-l-0", className)}
      {...props}
    >
      <PlusIcon />
    </NumberFieldPrimitive.Increment>
  )
}

function NumberFieldInput({ className, ...props }: NumberFieldPrimitive.Input.Props) {
  return (
    <NumberFieldPrimitive.Input
      data-slot="number-field-input"
      className={cn(
        "h-8 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-1 text-center text-base tabular-nums transition-colors outline-none focus-visible:z-10 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { NumberField, NumberFieldGroup, NumberFieldDecrement, NumberFieldIncrement, NumberFieldInput }
