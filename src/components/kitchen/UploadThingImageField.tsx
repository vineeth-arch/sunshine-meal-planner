import { useState } from 'react'

import { useAuth } from '../../features/auth/use-auth'
import { UploadDropzone } from '../../lib/uploadthing'

type UploadThingImageFieldProps = {
  disabled: boolean
  onUploaded(url: string): void
}

export function UploadThingImageField({ disabled, onUploaded }: UploadThingImageFieldProps) {
  const auth = useAuth()
  const [message, setMessage] = useState<string | null>(null)

  const token = auth.session?.access_token
  const canUpload = !disabled && Boolean(token)

  return (
    <div className="mk-field">
      Upload hosted image
      <UploadDropzone
        endpoint="imageUploader"
        disabled={!canUpload}
        headers={() => {
          const headers: Record<string, string> = {}
          if (token) headers.Authorization = `Bearer ${token}`
          return headers
        }}
        onClientUploadComplete={(result) => {
          const uploaded = result[0]
          const uploadedUrl = uploaded?.serverData?.url || uploaded?.ufsUrl || uploaded?.url
          if (!uploadedUrl) {
            setMessage('Upload completed, but no hosted URL was returned.')
            return
          }

          onUploaded(uploadedUrl)
          setMessage('Hosted image URL ready.')
        }}
        onUploadError={(error) => {
          setMessage(error.message || 'Image upload failed.')
        }}
      />
      {message ? <p className="mk-meta">{message}</p> : null}
    </div>
  )
}
