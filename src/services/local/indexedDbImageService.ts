import { openDB } from 'idb'

import { blobToDataUrl } from '../../lib/image/base64'
import {
  IMAGE_DB_NAME,
  IMAGE_DB_VERSION,
  STORE_DISH_IMAGES,
  STORE_INGREDIENT_IMAGES,
} from '../../lib/storage/keys'

type DishImageRecord = { sabjiId: string; blob: Blob }
type IngredientImageRecord = { name: string; blob: Blob }

async function getDb() {
  return openDB(IMAGE_DB_NAME, IMAGE_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_DISH_IMAGES)) {
        db.createObjectStore(STORE_DISH_IMAGES, { keyPath: 'sabjiId' })
      }

      if (!db.objectStoreNames.contains(STORE_INGREDIENT_IMAGES)) {
        db.createObjectStore(STORE_INGREDIENT_IMAGES, { keyPath: 'name' })
      }
    },
  })
}

export async function saveDishImage(id: string, blob: Blob) {
  const db = await getDb()
  await db.put(STORE_DISH_IMAGES, { sabjiId: id, blob } satisfies DishImageRecord)
}

export async function getDishImage(id: string) {
  const db = await getDb()
  const record = await db.get(STORE_DISH_IMAGES, id)
  return (record as DishImageRecord | undefined)?.blob ?? null
}

export async function deleteDishImage(id: string) {
  const db = await getDb()
  await db.delete(STORE_DISH_IMAGES, id)
}

export async function saveIngredientImage(name: string, blob: Blob) {
  const db = await getDb()
  await db.put(STORE_INGREDIENT_IMAGES, { name, blob } satisfies IngredientImageRecord)
}

export async function getIngredientImage(name: string) {
  const db = await getDb()
  const record = await db.get(STORE_INGREDIENT_IMAGES, name)
  return (record as IngredientImageRecord | undefined)?.blob ?? null
}

export async function deleteIngredientImage(name: string) {
  const db = await getDb()
  await db.delete(STORE_INGREDIENT_IMAGES, name)
}

export async function listDishImagesAsDataUrls() {
  const db = await getDb()
  const all = (await db.getAll(STORE_DISH_IMAGES)) as DishImageRecord[]
  const entries = await Promise.all(
    all.map(async (record) => [record.sabjiId, await blobToDataUrl(record.blob)] as const),
  )
  return Object.fromEntries(entries)
}

export async function listIngredientImagesAsDataUrls() {
  const db = await getDb()
  const all = (await db.getAll(STORE_INGREDIENT_IMAGES)) as IngredientImageRecord[]
  const entries = await Promise.all(
    all.map(async (record) => [record.name, await blobToDataUrl(record.blob)] as const),
  )
  return Object.fromEntries(entries)
}

export async function resolveDishImageSrc(id: string, hostedUrl?: string) {
  if (hostedUrl && (typeof navigator === 'undefined' || navigator.onLine)) return hostedUrl
  const blob = await getDishImage(id)
  return blob ? blobToDataUrl(blob) : hostedUrl ?? null
}

export async function resolveIngredientImageSrc(name: string, hostedUrl?: string) {
  if (hostedUrl && (typeof navigator === 'undefined' || navigator.onLine)) return hostedUrl
  const blob = await getIngredientImage(name)
  return blob ? blobToDataUrl(blob) : hostedUrl ?? null
}

export async function compressImage(file: File, maxPx = 1024, quality = 0.82): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not load image'))
      img.src = objectUrl
    })

    let { width, height } = image
    if (width > maxPx || height > maxPx) {
      if (width > height) {
        height = Math.round((height * maxPx) / width)
        width = maxPx
      } else {
        width = Math.round((width * maxPx) / height)
        height = maxPx
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')

    context.drawImage(image, 0, 0, width, height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Image compression failed'))
          return
        }

        resolve(blob)
      }, 'image/jpeg', quality)
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
