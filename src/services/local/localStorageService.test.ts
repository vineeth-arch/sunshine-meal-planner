import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getWeekStartDate } from '../../lib/date/plans'
import {
  STORAGE_KEY_INGREDIENTS,
  STORAGE_KEY_LAST_WEEK,
  STORAGE_KEY_PLAN,
  STORAGE_KEY_REPO,
  STORAGE_KEY_STAPLES,
} from '../../lib/storage/keys'
import {
  derivePantryItems,
  isCorruptedStorageKey,
  loadLocalKitchenState,
  readRawStorageValue,
  syncIngredientsFromRepo,
} from './localStorageService'

describe('localStorageService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-31T12:00:00.000Z'))
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    localStorage.clear()
  })

  it('renders defaults without writing local storage when local cache is empty', () => {
    const state = loadLocalKitchenState()

    expect(state.repo.length).toBeGreaterThan(0)
    expect(state.ingredients.length).toBeGreaterThan(0)
    expect(state.staples.length).toBeGreaterThan(0)
    expect(state.plan.weekStartingDate).toBe(getWeekStartDate())
    expect(readRawStorageValue(STORAGE_KEY_REPO)).toBeNull()
    expect(readRawStorageValue(STORAGE_KEY_PLAN)).toBeNull()
    expect(readRawStorageValue(STORAGE_KEY_STAPLES)).toBeNull()
    expect(readRawStorageValue(STORAGE_KEY_INGREDIENTS)).toBeNull()
  })

  it('detects corrupted storage and falls back safely', () => {
    localStorage.setItem(STORAGE_KEY_REPO, '{not-json')
    localStorage.setItem(STORAGE_KEY_PLAN, '{broken')

    const state = loadLocalKitchenState()

    expect(isCorruptedStorageKey(STORAGE_KEY_REPO)).toBe(true)
    expect(isCorruptedStorageKey(STORAGE_KEY_PLAN)).toBe(true)
    expect(state.repo.length).toBeGreaterThan(0)
    expect(state.plan.weekStartingDate).toBe(getWeekStartDate())
  })

  it('renders stale plans as last week without writing rollover keys', () => {
    const stalePlan = {
      weekStartingDate: '2026-05-18',
      days: {
        monday: {
          breakfast: { sabjis: ['dish-1'] },
          lunch: { curry: '', sabji: '', gujaratiSabji: '' },
          dinner: { curry: '', sabjis: [], gujaratiSabji: '' },
        },
      },
    }

    localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(stalePlan))

    const state = loadLocalKitchenState()
    expect(localStorage.getItem(STORAGE_KEY_LAST_WEEK)).toBeNull()
    expect(state.lastWeekPlan?.weekStartingDate).toBe('2026-05-18')
    expect(state.plan.weekStartingDate).toBe('2026-05-25')
    expect(state.plan.days.monday.breakfast.sabjis).toEqual([])
  })

  it('syncs repo ingredients and derives pantry items while skipping staples', () => {
    const synced = syncIngredientsFromRepo(
      [
        {
          id: 'dish-1',
          name: 'Mixed Veg',
          category: 'sabji',
          mainIngredients: ['Carrot', 'Salt', 'Peas'],
          emoji: '🥕',
          bgColor: '#eee',
          referenceText: '',
          recipe: '',
          youtube: '',
          image: '',
        },
      ],
      [
        {
          name: 'Carrot',
          emoji: '🥕',
          malayalam: '',
          gujarati: '',
          image: '',
        },
      ],
      ['salt'],
    )

    expect(synced).toEqual([
      expect.objectContaining({ name: 'Carrot' }),
      expect.objectContaining({ name: 'Peas' }),
    ])

    const pantry = derivePantryItems(synced, ['salt'])
    expect(pantry).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ingredient:carrot', kind: 'ingredient' }),
        expect.objectContaining({ id: 'ingredient:peas', kind: 'ingredient' }),
        expect.objectContaining({ id: 'staple:salt', kind: 'staple' }),
      ]),
    )
  })
})
