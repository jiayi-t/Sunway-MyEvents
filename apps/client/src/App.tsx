import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/auth-context'
import SelectLoginPage from './pages/auth/select-login-page'
import StudentLoginPage from './pages/auth/student-login-page'
import SelectPreferencesPage from './pages/student/select-preferences-page'
import HomePage from './pages/student/home-page'
import StudentEventDetailsPage from './pages/student/student-event-details-page'
import StudentProfilePage from './pages/student/student-profile-page'
import MyEventsPage from './pages/student/student-my-events-page'
import MyPreferencesPage from './pages/student/my-preferences-page'
import OrganizerLoginPage from './pages/auth/organizer-login-page'
import OrganizerCreateAccount from './pages/auth/organizer-create-account'
import OrganizerDashboard from './pages/organizer/organizer-dashboard'
import OrganizerEventsPage from './pages/organizer/organizer-my-events-page'
import OrganizerEventDetailsPage from './pages/organizer/organizer-event-details-page'
import OrganizerEditEventPage from './pages/organizer/organizer-edit-event-page'
import StudentCheckinPage from './pages/student/student-checkin-page'
import Footer from './components/footer'
import type { ReactNode } from 'react'

const queryClient = new QueryClient()

const LOGIN_PATHS = ['/login', '/login/student', '/login/organizer', '/select-preferences']

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const hideFooter = LOGIN_PATHS.includes(pathname)

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <div className="flex-1">{children}</div>
      {!hideFooter && <Footer />}
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<SelectLoginPage />} />
      <Route path="/login/student" element={<StudentLoginPage />} />
      <Route path="/" 
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/select-preferences"
        element={
          <ProtectedRoute>
            <SelectPreferencesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/events/:id"
        element={
        <ProtectedRoute>
          <StudentEventDetailsPage />
        </ProtectedRoute>
        }
      />
      <Route path="/events/:id/checkin"
        element={
        <ProtectedRoute>
          <StudentCheckinPage />
        </ProtectedRoute>
        }
      />
      <Route path="/profile" 
        element={
        <ProtectedRoute>
          <StudentProfilePage />
        </ProtectedRoute>
        } 
      />
      <Route path="/my-events" 
        element={
        <ProtectedRoute>
          <MyEventsPage />
        </ProtectedRoute>
        } 
      />
      <Route path="/my-preferences"
        element={
          <ProtectedRoute>
            <MyPreferencesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/login/organizer" element={<OrganizerLoginPage />} />
      <Route path="/login/organizer/register" element={<OrganizerCreateAccount />} />
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
      <Route path="/organizer/events/:id"
        element={
        <ProtectedRoute>
          <OrganizerEventDetailsPage />
        </ProtectedRoute>
        }
      />
      <Route path="/organizer/events/:id/edit"
        element={
        <ProtectedRoute>
          <OrganizerEditEventPage />
        </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}