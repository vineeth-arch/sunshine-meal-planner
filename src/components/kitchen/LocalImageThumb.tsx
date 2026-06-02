import { useEffect, useState } from 'react'

import { resolveDishImageSrc, resolveIngredientImageSrc } from '../../services/local/indexedDbImageService'

type LocalImageThumbProps = {
  kind: 'dish' | 'ingredient'
  id: string
  hostedUrl?: string
  emoji: string
  alt: string
  className?: string
}

export function LocalImageThumb({
  kind,
  id,
  hostedUrl,
  emoji,
  alt,
  className,
}: LocalImageThumbProps) {
  const [src, setSrc] = useState<string | null>(hostedUrl ?? null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const resolved =
        kind === 'dish'
          ? await resolveDishImageSrc(id, hostedUrl)
          : await resolveIngredientImageSrc(id, hostedUrl)

      if (!cancelled) setSrc(resolved)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [hostedUrl, id, kind])

  async function handleImageError() {
    if (!hostedUrl || src !== hostedUrl) return

    const fallback =
      kind === 'dish'
        ? await resolveDishImageSrc(id)
        : await resolveIngredientImageSrc(id)

    setSrc(fallback)
  }

  if (src) {
    return <img src={src} alt={alt} className={className} onError={() => void handleImageError()} />
  }

  return <div className={className}>{emoji}</div>
}
