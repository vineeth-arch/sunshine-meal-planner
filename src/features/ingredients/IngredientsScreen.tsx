import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { placeholderIngredients } from '../../data/placeholders'

export function IngredientsScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Ingredients"
        title="Ingredient reference placeholder"
        description="This screen is the future home for ingredient metadata, translations, and stock-aware helpers."
      />

      <div className="mk-card-grid">
        {placeholderIngredients.map((ingredient) => (
          <PanelCard key={ingredient.name} className="mk-stack-sm">
            <h3 className="mk-subtitle">{ingredient.name}</h3>
            <p className="mk-copy">{ingredient.note}</p>
          </PanelCard>
        ))}
      </div>
    </div>
  )
}
