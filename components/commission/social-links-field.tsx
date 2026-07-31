"use client"

import { useId } from "react"
import { PlusIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export interface SocialLink {
  id: string
  url: string
}

interface SocialLinksFieldProps {
  links: SocialLink[]
  onLinksChange: (links: SocialLink[]) => void
  errors?: Record<string, string>
}

export function SocialLinksField({ links, onLinksChange, errors }: SocialLinksFieldProps) {
  const idPrefix = useId()

  function addLink() {
    onLinksChange([...links, { id: `${idPrefix}-${links.length}-${Date.now()}`, url: "" }])
  }

  function updateLink(id: string, url: string) {
    onLinksChange(links.map((link) => (link.id === id ? { ...link, url } : link)))
  }

  function removeLink(id: string) {
    onLinksChange(links.filter((link) => link.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Social links (optional)</p>
      {links.map((link, index) => (
        <Field key={link.id} invalid={!!errors?.[link.id]} className="flex-row items-center gap-2">
          <Input
            type="url"
            placeholder="https://instagram.com/yourhandle"
            value={link.url}
            onChange={(event) => updateLink(link.id, event.target.value)}
            aria-label={`Social link ${index + 1}`}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeLink(link.id)}
            aria-label="Remove social link"
          >
            <XIcon />
          </Button>
          {errors?.[link.id] && <FieldError match>{errors[link.id]}</FieldError>}
        </Field>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addLink} className="w-fit">
        <PlusIcon />
        Add another link
      </Button>
    </div>
  )
}
