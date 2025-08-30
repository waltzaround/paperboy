import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App.tsx'
import { ArticleDetail } from './components/ArticleDetail.tsx'
import { About } from './components/About.tsx'

// Force dark mode regardless of user's system preference
document.documentElement.classList.add('dark')

// Prevent system preference from overriding dark mode
const forceDarkMode = () => {
  document.documentElement.classList.add('dark')
}

// Add event listener to ensure dark mode persists
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', forceDarkMode)

// Initial call to force dark mode
forceDarkMode()

// Create router with React Router v7
const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/about',
    element: <About />,
  },
  {
    path: '/:date',
    element: <ArticleDetail />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)