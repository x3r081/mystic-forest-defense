import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/**
 * Fade out the dependency-free boot splash from index.html once React has
 * mounted and the browser has painted a frame, so players never see a flash of
 * empty canvas between the bundle loading and the scene appearing.
 */
function dismissBootSplash() {
  const splash = document.getElementById('boot-splash')
  if (!splash || splash.classList.contains('boot-hidden')) return
  splash.classList.add('boot-hidden')
  splash.addEventListener('transitionend', () => splash.remove(), { once: true })
  // Fallback removal in case the transitionend event never fires.
  window.setTimeout(() => splash.remove(), 1000)
}

// Prefer fading out after the first painted frame, but always fall back to a
// timer: requestAnimationFrame is paused in backgrounded tabs, and the splash
// must never get stuck on screen.
requestAnimationFrame(() => requestAnimationFrame(dismissBootSplash))
window.setTimeout(dismissBootSplash, 1500)
