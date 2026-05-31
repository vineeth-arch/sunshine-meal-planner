import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ExportPayload, LocalKitchenState } from '../../types/domain'
import { createEmptyWeekDays } from '../../lib/date/plans'
import { applyImportPayload, buildExportPayload, parseImportPayload } from './importExportService'

function createState(): LocalKitchenState {
  return {
    repo: [
      {
        id: 'dish-1',
        name: 'Aloo Fry',
        category: 'sabji',
        mainIngredients: ['Potato', 'Oil'],
        emoji: '🥔',
        bgColor: '#eee',
        referenceText: 'crispy',
        recipe: 'pan fry',
        youtube: '',
        image: '',
      },
    ],
    ingredients: [
      {
        name: 'Potato',
        emoji: '🥔',
        malayalam: 'ഉരുളക്കിഴങ്ങ്',
        gujarati: 'બટાકા',
        image: '',
      },
    ],
    staples: ['oil'],
    pantry: [],
    plan: {
      weekStartingDate: '2026-05-25',
      days: createEmptyWeekDays(),
    },
    lastWeekPlan: null,
    integrations: {},
    settings: {
      integrations: {},
      profile: {
        displayName: 'Family kitchen',
        householdLabel: "Mom's Kitchen",
        notes: 'Local-only profile placeholder',
      },
    },
    profile: {
      displayName: 'Family kitchen',
      householdLabel: "Mom's Kitchen",
      notes: 'Local-only profile placeholder',
    },
  }
}

describe('importExportService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'))
  })

  it('builds an export payload from local state', () => {
    const state = createState()

    expect(buildExportPayload(state)).toEqual<ExportPayload>({
      version: 1,
      sabjis: state.repo,
      ingredients: state.ingredients,
      staples: state.staples,
    })
  })

  it('rejects unsupported import versions', () => {
    expect(() => parseImportPayload(JSON.stringify({ version: 2 }))).toThrow(
      'Unsupported or missing version. Expected schema v1.',
    )
  })

  it('normalizes partial import payloads and filters invalid rows', () => {
    const parsed = parseImportPayload(
      JSON.stringify({
        version: 1,
        sabjis: [
          { name: ' Paneer Butter Masala ', category: 'curry', mainIngredients: ['Paneer', ' Tomato '] },
          { category: 'sabji' },
        ],
        ingredients: [
          { name: 'Paneer', emoji: '🧀' },
          { emoji: '🥬' },
        ],
        staples: [' Salt ', 'salt', '', 'Oil'],
      }),
    )

    expect(parsed.sabjis).toEqual([
      expect.objectContaining({
        id: `paneer-butter-masala-${Date.now().toString(36)}`,
        name: 'Paneer Butter Masala',
        category: 'curry',
        mainIngredients: ['Paneer', 'Tomato'],
        emoji: '🥗',
      }),
    ])
    expect(parsed.ingredients).toEqual([
      {
        name: 'Paneer',
        emoji: '🧀',
        malayalam: '',
        gujarati: '',
        image: '',
      },
    ])
    expect(parsed.staples).toEqual(['salt', 'oil'])
  })

  it('merges imported dishes, ingredients, staples, and pantry dependencies', () => {
    const state = createState()
    const payload: ExportPayload = {
      version: 1,
      sabjis: [
        {
          id: 'dish-1',
          name: 'Aloo Roast',
          category: 'sabji',
          mainIngredients: ['Potato', 'Oil'],
          emoji: '🥔',
          bgColor: '#ddd',
          referenceText: '',
          recipe: '',
          youtube: '',
          image: '',
        },
        {
          id: 'dish-2',
          name: 'Paneer Curry',
          category: 'curry',
          mainIngredients: ['Paneer', 'Oil'],
          emoji: '🧀',
          bgColor: '#ccc',
          referenceText: '',
          recipe: '',
          youtube: '',
          image: '',
        },
      ],
      ingredients: [
        {
          name: 'Paneer',
          emoji: '🧀',
          malayalam: 'paneer-ml',
          gujarati: 'paneer-gu',
          image: '',
        },
        {
          name: 'Potato',
          emoji: '🥔',
          malayalam: 'new potato',
          gujarati: 'new bataka',
          image: '',
        },
      ],
      staples: ['salt'],
    }

    const result = applyImportPayload(state, payload)

    expect(result.stats).toEqual({ dishAdd: 1, dishUpd: 1, ingAdd: 1, ingUpd: 1 })
    expect(result.nextState.repo).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'dish-1', name: 'Aloo Roast' }),
        expect.objectContaining({ id: 'dish-2', name: 'Paneer Curry' }),
      ]),
    )
    expect(result.nextState.staples).toEqual(['oil', 'salt'])
    expect(result.nextState.ingredients).toEqual([
      expect.objectContaining({ name: 'Paneer', malayalam: 'paneer-ml' }),
      expect.objectContaining({ name: 'Potato', malayalam: 'new potato' }),
    ])
    expect(result.nextState.pantry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ingredient:paneer', kind: 'ingredient' }),
        expect.objectContaining({ id: 'staple:salt', kind: 'staple' }),
      ]),
    )
  })
})
