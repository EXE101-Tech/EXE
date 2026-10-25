import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import './styles/sportgo.css'
import './styles/attendance.css'
import './styles/gamerooms.css'
import './styles/reactions.css'
import App from './app/App.jsx'
import './i18n';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
