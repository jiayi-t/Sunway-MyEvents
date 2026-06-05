import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth-context'
import LoginPage from './pages/login-page'
import HomePage from './pages/student/home-page'
import EventDetailPage from './pages/student/event-details-page'
import OrganizerDashboard from './pages/organizer/organizer-dashboard'
import OrganizerEventsPage from './pages/organizer/organizer-my-events-page'
import Footer from './components/footer'
import type { ReactNode } from 'react'

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/events/:id" 
        element={
          <ProtectedRoute>
            <EventDetailPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/organizer/dashboard" 
        element={
          <ProtectedRoute>
            <OrganizerDashboard />
          </ProtectedRoute>
        } 
      />
      <Route path="/organizer/events" 
        element={
          <ProtectedRoute>
            <OrganizerEventsPage />
          </ProtectedRoute>
        } 
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-surface">
          <div className="flex-1">
            <AppRoutes />
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}