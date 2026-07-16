import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'
import { useNotificationsQuery } from '../api/queries'
import Avatar from './avatar'
import { Menu, Bell, ChevronDown, X, Home, Calendar, User, Settings, LogOut, LayoutDashboard, BarChart2 } from 'lucide-react'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const desktopMenuRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (
        !mobileMenuRef.current?.contains(e.target as Node) &&
        !desktopMenuRef.current?.contains(e.target as Node)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])
  const navigate = useNavigate()
  const location = useLocation()
  const { data: notifications = [] } = useNotificationsQuery(!!user)
  const unreadCount = (notifications as any[]).filter(n => !n.read_at).length

  // logo click: go to the role's home page, or scroll to top if already there
  const goHome = () => {
    const home = user?.role === 'organizer' ? '/organizer/dashboard' : '/'
    if (location.pathname === home) window.scrollTo({ top: 0, behavior: 'smooth' })
    else navigate(home)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
    setMenuOpen(false)
  }

  const studentNav = [
    { label: 'Home', path: '/' },
    { label: 'Browse', path: '/browse' },
    { label: 'My Events', path: '/my-events' },
  ]

  const organizerNav = [
    { label: 'Dashboard', path: '/organizer/dashboard' },
    { label: 'My Events', path: '/organizer/events' },
    { label: 'Analytics', path: '/organizer/analytics' },
  ]

  const navLinks = user?.role === 'organizer' ? organizerNav : studentNav

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const mobileMenuItems = (
    <>
      {user && (
        <div className="px-4 py-4 border-b flex flex-col items-start">
          <Avatar src={user.image_url} alt={user.name} className="w-16 h-16" />
          <p className="text-sm font-semibold text-foreground truncate max-w-full mt-2">{user.name}</p>
          <p className="text-xs text-gray-500 truncate max-w-full">
            {user.role === 'public' ? user.email : user.sunway_id}
          </p>
        </div>
      )}
      {user?.role === 'organizer' ? (
        <>
          <button
            onClick={() => { navigate('/organizer/dashboard'); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-gray-100">
            <LayoutDashboard className="w-4 h-4 text-gray-500" aria-hidden="true" />Dashboard
          </button>
          <button
            onClick={() => { navigate('/organizer/events'); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-gray-100">
            <Calendar className="w-4 h-4 text-gray-500" aria-hidden="true" />My Events
          </button>
          <button
            onClick={() => { navigate('/organizer/analytics'); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-gray-100">
            <BarChart2 className="w-4 h-4 text-gray-500" aria-hidden="true" />Analytics
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => { navigate('/profile'); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-gray-100">
            <User className="w-4 h-4 text-gray-500" aria-hidden="true" />My Profile
          </button>
          <button
            onClick={() => { navigate('/'); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-gray-100">
            <Home className="w-4 h-4 text-gray-500" aria-hidden="true" />Home
          </button>
          <button
            onClick={() => { navigate('/my-events'); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-gray-100">
            <Calendar className="w-4 h-4 text-gray-500" aria-hidden="true" />My Events
          </button>
          <button
            onClick={() => { navigate('/settings'); setMenuOpen(false) }}
            className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm hover:bg-gray-100">
            <Settings className="w-4 h-4 text-gray-500" aria-hidden="true" />Settings
          </button>
        </>
      )}
      <div className="border-t my-2" />
      <button
        onClick={handleLogout}
        className="w-full flex items-center gap-3 text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
        <LogOut className="w-4 h-4" aria-hidden="true" />Sign Out
      </button>
    </>
  )

  const desktopMenuItems = (
    <>
      {user && <div className="px-4 py-2 text-sm text-gray-600 border-b">{user.name}</div>}
      {(user?.role === 'student' || user?.role === 'public') && (
        <>
          <button 
            onClick={() => { navigate('/profile'); setMenuOpen(false) }} 
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">My Profile
          </button>
          <button 
            onClick={() => { navigate('/settings'); setMenuOpen(false) }} 
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">Settings
          </button>
        </>
      )}
      <button 
        onClick={handleLogout} 
        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Sign Out
      </button>
    </>
  )

  return (
    <header className="sticky top-0 z-50 w-full bg-secondary shadow border-b border-gray-200">
      {/* Mobile */}
      <div className="lg:hidden px-4 py-3 flex items-center justify-between relative">
        <div className="flex items-center" ref={mobileMenuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-black focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" aria-hidden="true" />
          </button>
          <div
            className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 ${
              menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setMenuOpen(false)}
          />
          <div
            inert={!menuOpen}
            className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 flex flex-col transition-transform duration-300 ${
              menuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <span className="text-lg font-bold">
                <span className="text-primary">Sunway </span>
                <span className="text-accent">MyEvents</span>
              </span>
              <button
                onClick={() => setMenuOpen(false)}
                className="text-gray-500 hover:text-black"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            <div className="py-3 overflow-y-auto">
              {mobileMenuItems}
            </div>
          </div>
        </div>
        <div className="absolute left-1/2 transform -translate-x-1/2 text-lg font-bold pointer-events-none z-40">
          <button onClick={goHome} className="pointer-events-auto">
            <span className="text-primary">Sunway </span>
            <span className="text-accent">MyEvents</span>
          </button>
        </div>

        {(user?.role === 'student' || user?.role === 'public') ? (
          <button onClick={() => navigate('/notifications')} className="relative w-10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Desktop */}
      <div className="hidden lg:block relative py-3 w-full">
        {/* Logo */}
        <button
          onClick={goHome}
          className="absolute left-6 top-1/2 -translate-y-1/2 text-lg font-bold whitespace-nowrap"
        >
          <span className="text-primary">Sunway </span>
          <span className="text-accent">MyEvents</span>
        </button>

        {/* Nav */}
        <div className="max-w-2xl mx-auto flex items-center gap-6">
          {navLinks.map(link => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`text-sm transition-colors ${
                isActive(link.path) ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* User */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-3">
          {(user?.role === 'student' || user?.role === 'public') && (
            <button onClick={() => navigate('/notifications')} className="relative w-8 flex items-center justify-center">
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          )}
          <div className="relative" ref={desktopMenuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-1.5 text-sm text-gray-700 hover:text-primary transition-colors"
            >
              <span className="font-medium">{user?.name}</span>
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded shadow-lg z-50 border border-gray-100">
                {desktopMenuItems}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}