"use client"

import { useEffect, useId, useRef } from "react"
import Image from "next/image"
import { UploadIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export interface ReferenceImage {
  id: string
  file: File
  previewUrl: string
}

interface ReferenceImageUploadProps {
  images: ReferenceImage[]
  onImagesChange: (images: ReferenceImage[]) => void
}

export function ReferenceImageUpload({ images, onImagesChange }: ReferenceImageUploadProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef(images)

  useEffect(() => {
    imagesRef.current = images
  }, [images])

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [])

  function handleFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    )
    const newImages: ReferenceImage[] = files.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }))
    onImagesChange([...images, ...newImages])
    event.target.value = ""
  }

  function removeImage(id: string) {
    const target = images.find((image) => image.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onImagesChange(images.filter((image) => image.id !== id))
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Reference images (optional)</p>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        className="w-fit"
      >
        <UploadIcon />
        Choose files
      </Button>
      {images.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {images.map((image) => (
            <li key={image.id} className="relative size-20 overflow-hidden rounded-lg border border-input">
              <Image
                src={image.previewUrl}
                alt={image.file.name}
                fill
                unoptimized
                className="object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                onClick={() => removeImage(image.id)}
                className="absolute top-1 right-1"
                aria-label={`Remove ${image.file.name}`}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
