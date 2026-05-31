import { PanelCard } from '../../components/ui/PanelCard'
import { ScreenHeader } from '../../components/ui/ScreenHeader'
import { placeholderDishes } from '../../data/placeholders'

export function DishesScreen() {
  return (
    <div className="mk-stack-lg">
      <ScreenHeader
        eyebrow="Dishes"
        title="Dish library placeholder"
        description="The real recipe and dish management logic will migrate later. This screen defines the route and visual pattern now."
      />

      <div className="mk-card-grid">
        {placeholderDishes.map((dish) => (
          <PanelCard key={dish.name} className="mk-stack-sm">
            <p className="mk-meta">{dish.type}</p>
            <h3 className="mk-subtitle">{dish.name}</h3>
            <p className="mk-copy">Hero ingredient: {dish.heroIngredient}</p>
          </PanelCard>
        ))}
      </div>
    </div>
  )
}
