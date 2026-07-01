import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/auth-context'
import SelectLoginPage from './pages/auth/select-login-page'
import StudentLoginPage from './pages/auth/student-login-page'
import SelectInterestsPage from './pages/student/select-interests-page'
import HomePage from './pages/student/home-page'
import BrowseEventsPage from './pages/student/browse-events-page'
import StudentEventDetailsPage from './pages/student/student-event-details-page'
import StudentProfilePage from './pages/student/student-profile-page'
import MyEventsPage from './pages/student/student-my-events-page'
import StudentCheckinPage from './pages/student/student-checkin-page'
import MockPaymentPage from './pages/student/mock-payment-page'
import StudentFeedbackPage from './pages/student/student-feedback-page'
import SettingsPage from './pages/student/student-settings-page'
import NotificationsPage from './pages/student/notifications-page'
import OrganizerLoginPage from './pages/auth/organizer-login-page'
import ForgotPasswordPage from './pages/auth/forgot-password-page'
import ResetPasswordPage from './pages/auth/reset-password-page'
import OrganizerCreateAccount from './pages/auth/organizer-create-account'
import OrganizerProfilePage from './pages/organizer/organizer-profile-page'
import OrganizerEventsPage from './pages/organizer/organizer-my-events-page'
import OrganizerEventDetailsPage from './pages/organizer/organizer-event-details-page'
import OrganizerEditEventPage from './pages/organizer/organizer-edit-event-page'
import OrganizerCheckinScannerPage from './pages/organizer/organizer-checkin-scanner-page'
import OrganizerParticipantsPage from './pages/organizer/organizer-participants-page'
import OrganizerFeedbackFormPage from './pages/organizer/organizer-feedback-form-page'
import OrganizerAnalyticsPage from './pages/organizer/organizer-analytics-page'
import OrganizerEventAnalyticsPage from './pages/organizer/organizer-event-analytics-page'
import OrganizerEditProfilePage from './pages/organizer/organizer-edit-profile-page'
import Header from './components/header'
import Footer from './components/footer'
import type { ReactNode } from 'react'

// cache query results for 1 minute before marking them stale and refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 },
  },
})

const AUTH_PATHS = [
  '/login', '/login/student', '/login/organizer', '/login/organizer/register',
  '/select-interests', '/forgot-password', '/reset-password',
]

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()

  if (AUTH_PATHS.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen flex flex-col lg:bg-slate-100">
      <Header />
      <div className="flex-1 w-full max-w-2xl mx-auto bg-surface flex flex-col">
        {children}
      </div>
      <Footer />
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
      <Route path="/browse"
        element={
          <ProtectedRoute>
            <BrowseEventsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/select-interests"
        element={
          <ProtectedRoute>
            <SelectInterestsPage />
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
      <Route path="/events/:id/pay"
        element={
        <ProtectedRoute>
          <MockPaymentPage />
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
      <Route path="/events/:id/feedback"
        element={
        <ProtectedRoute>
          <StudentFeedbackPage />
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
      <Route path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/organizers/:id"
        element={
          <ProtectedRoute>
            <OrganizerProfilePage />
          </ProtectedRoute>
        }
      />
      <Route path="/login/organizer" element={<OrganizerLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login/organizer/register" element={<OrganizerCreateAccount />} />
      <Route path="/organizer/dashboard" 
        element={
        <ProtectedRoute>
          <OrganizerProfilePage />
        </ProtectedRoute>
        } 
      />
      <Route path="/organizer/profile"
        element={
        <ProtectedRoute>
          <OrganizerEditProfilePage />
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
      <Route path="/organizer/events/:id/checkin"
        element={
        <ProtectedRoute>
          <OrganizerCheckinScannerPage />
        </ProtectedRoute>
        }
      />
      <Route path="/organizer/events/:id/participants"
        element={
        <ProtectedRoute>
          <OrganizerParticipantsPage />
        </ProtectedRoute>
        }
      />
      <Route path="/organizer/events/:id/feedback-form"
        element={
        <ProtectedRoute>
          <OrganizerFeedbackFormPage />
        </ProtectedRoute>
        }
      />
      <Route path="/organizer/feedback-form/new"
        element={
        <ProtectedRoute>
          <OrganizerFeedbackFormPage />
        </ProtectedRoute>
        }
      />
      <Route path="/organizer/analytics"
        element={
        <ProtectedRoute>
          <OrganizerAnalyticsPage />
        </ProtectedRoute>
        }
      />
      <Route path="/organizer/events/:id/analytics"
        element={
        <ProtectedRoute>
          <OrganizerEventAnalyticsPage />
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
          <ScrollToTop />
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}