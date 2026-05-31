import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import type { User } from 'firebase/auth'

import type { LocalKitchenState, UserProfile } from '../../types/domain'
import { getFirebaseServices } from '../../lib/firebase'

export async function pushKitchenStateToFirestore(user: User, profile: UserProfile, state: LocalKitchenState) {
  const services = getFirebaseServices()
  if (!services) throw new Error('Firebase is not configured.')
  if (profile.role !== 'admin') {
    throw new Error('An admin profile with a household is required before cloud sync.')
  }

  const batch = writeBatch(services.db)
  const householdRef = doc(services.db, 'households', profile.householdId)
  batch.set(
    householdRef,
    {
      id: profile.householdId,
      name: "Mom's Kitchen",
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    },
    { merge: true },
  )

  state.repo.forEach((dish) => {
    batch.set(doc(collection(householdRef, 'dishes'), dish.id), dish)
  })

  state.ingredients.forEach((ingredient) => {
    batch.set(
      doc(collection(householdRef, 'ingredients'), ingredient.name.toLowerCase()),
      ingredient,
    )
  })

  batch.set(doc(collection(householdRef, 'staples'), 'main'), {
    values: state.staples,
    updatedAt: serverTimestamp(),
  })

  batch.set(doc(collection(householdRef, 'plans'), 'current'), state.plan)
  batch.set(doc(collection(householdRef, 'settings'), 'localMigration'), {
    importedAt: serverTimestamp(),
    legacyIntegrationsPresent: Boolean(state.integrations.llmKey || state.integrations.imgbbKey),
  })

  await batch.commit()
}
