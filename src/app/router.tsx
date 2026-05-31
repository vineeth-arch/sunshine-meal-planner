import { createBrowserRouter, Navigate } from 'react-router-dom'

import App from '../App'
import { AdminScreen } from '../features/admin/AdminScreen'
import { LoginScreen } from '../features/auth/LoginScreen'
import { DishesScreen } from '../features/dishes/DishesScreen'
import { IngredientsScreen } from '../features/ingredients/IngredientsScreen'
import { DashboardScreen } from '../features/meal-planner/DashboardScreen'
import { TodayScreen } from '../features/meal-planner/TodayScreen'
import { TomorrowScreen } from '../features/meal-planner/TomorrowScreen'
import { WeekPlannerScreen } from '../features/meal-planner/WeekPlannerScreen'
import { PantryScreen } from '../features/pantry/PantryScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { NotFound } from './NotFound'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginScreen />,
  },
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardScreen />,
      },
      {
        path: 'today',
        element: <TodayScreen />,
      },
      {
        path: 'tomorrow',
        element: <TomorrowScreen />,
      },
      {
        path: 'week-planner',
        element: <WeekPlannerScreen />,
      },
      {
        path: 'pantry',
        element: <PantryScreen />,
      },
      {
        path: 'dishes',
        element: <DishesScreen />,
      },
      {
        path: 'ingredients',
        element: <IngredientsScreen />,
      },
      {
        path: 'settings',
        element: <SettingsScreen />,
      },
      {
        path: 'admin',
        element: <AdminScreen />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
])
