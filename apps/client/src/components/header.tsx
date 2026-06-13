import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { Menu } from 'lucide-react'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between bg-secondary shadow relative border-b border-gray-200">
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-black focus:outline-none w-10 text-center"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6 mx-auto" aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white rounded shadow-lg z-50">
            {user && (
              <div className="px-4 py-2 text-sm text-gray-600 border-b">
                {user.name}
              </div>
            )}
            <button
              onClick={() => { navigate('/profile'); setMenuOpen(false) }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              My Profile
            </button>
            <button
              onClick={() => { navigate('/'); setMenuOpen(false) }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Home
            </button>
            <button
              onClick={() => { navigate('/my-events'); setMenuOpen(false) }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              My Events
            </button>
            <button
              onClick={() => { navigate('/my-preferences'); setMenuOpen(false) }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              My Preferences
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
      <div className="absolute left-1/2 transform -translate-x-1/2 text-lg font-bold pointer-events-none z-40">
        <div className="pointer-events-auto">
          <span className="text-primary">Sunway </span>
          <span className="text-accent">MyEvents</span>
        </div>
      </div>

      <div className="w-10" />
    </header>
  )
}