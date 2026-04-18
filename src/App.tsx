import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { router } from './routes'
import { useSettingsStore } from '@/store/settings.store'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
})

function SettingsApplier() {
  const { highContrast, fontSize } = useSettingsStore()

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('high-contrast', highContrast)
  }, [highContrast])

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('font-size-large', 'font-size-xlarge')
    if (fontSize === 'large') root.classList.add('font-size-large')
    if (fontSize === 'xlarge') root.classList.add('font-size-xlarge')
  }, [fontSize])

  return null
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsApplier />
      <RouterProvider router={router} />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  )
}
