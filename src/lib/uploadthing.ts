import { generateUploadButton, generateUploadDropzone } from '@uploadthing/react'

import type { HouseholdFileRouter } from '../../functions/api/uploadthing'

export const UploadButton = generateUploadButton<HouseholdFileRouter>({
  url: '/api/uploadthing',
})

export const UploadDropzone = generateUploadDropzone<HouseholdFileRouter>({
  url: '/api/uploadthing',
})
