"use client"

import type * as React from "react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CommissionTypeTabsProps {
  commissionType: "portrait" | "custom"
  onCommissionTypeChange: (type: "portrait" | "custom") => void
  portraitContent: React.ReactNode
  customContent: React.ReactNode
}

export function CommissionTypeTabs({
  commissionType,
  onCommissionTypeChange,
  portraitContent,
  customContent,
}: CommissionTypeTabsProps) {
  return (
    <Tabs
      value={commissionType}
      onValueChange={(value) => onCommissionTypeChange(value as "portrait" | "custom")}
    >
      <TabsList>
        <TabsTrigger value="portrait">Portrait</TabsTrigger>
        <TabsTrigger value="custom">Custom Piece</TabsTrigger>
      </TabsList>
      <TabsContent value="portrait">{portraitContent}</TabsContent>
      <TabsContent value="custom">{customContent}</TabsContent>
    </Tabs>
  )
}
