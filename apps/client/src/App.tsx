import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/auth-context'
import SelectLoginPage from './pages/auth/select-login-page'
import StudentLoginPage from './pages/auth/student-login-page'
import SelectInterestsPage from './pages/student/select-interests-page'
import StudentOnboardingPage from './pages/student/student-onboarding-page'
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
import ChangePasswordPage from './pages/auth/change-password-page'
import OrganizerCreateAccount from './pages/auth/organizer-create-account'
import OrganizerProfilePage from './pages/organizer/organizer-profile-page'
import OrganizerEventsPage from './pages/organizer/organizer-my-events-page'
import OrganizerCreateEventPage from './pages/organizer/organizer-create-event-page'
import OrganizerEventDetailsPage from './pages/organizer/organizer-event-details-page'
import OrganizerEditEventPage from './pages/organizer/organizer-edit-event-page'
import OrganizerCheckinScannerPage from './pages/organizer/organizer-checkin-scanner-page'
import OrganizerParticipantsPage from './pages/organizer/organizer-participants-page'
import OrganizerFeedbackFormPage from './pages/organizer/organizer-feedback-form-page'
import OrganizerAnalyticsPage from './pages/organizer/organizer-analytics-page'
import OrganizerEventAnalyticsPage from './pages/organizer/organizer-event-analytics-page'
import OrganizerEditProfilePage from './pages/organizer/organizer-edit-profile-page'
import PublicLoginPage from './pages/auth/public-login-page'
import PublicCreateAccount from './pages/auth/public-create-account'
import PublicSettingsPage from './pages/general-public/public-settings-page'
import PublicProfilePage from './pages/general-public/public-profile-page'
import PublicCheckinPage from './pages/general-public/public-checkin-page'
import Header from './components/header'
import Footer from './components/footer'
import type { ReactNode } from 'react'

// cache query results for 1 minute before marking them stale and refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      // do not retry client errors (401/403/404) as they will never resolve, and retrying keeps pages on the skeleton loader
      retry: (failureCount, error: any) => {
        const status = error?.response?.status
        if (status >= 400 && status < 500) return false
        return failureCount < 3
      },
    },
  },
})

const AUTH_PATHS = [
  '/login', '/login/student', '/login/organizer', '/login/organizer/register', '/login/public', '/login/public/register',
  '/select-interests', '/student-onboarding', '/forgot-password', '/reset-password',
]

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// gate student/public-only pages, organizers land on their dashboard (they have no student pages), guests go to login
const StudentPublicRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'organizer') return <Navigate to="/organizer/dashboard" replace />
  return children
}

// gate /organizer/* routes to the organizer role, non-organizers (students, public, guests) get their own event details page, otherwise home (logged in) or login (guest)
const OrganizerRoute = ({ children, eventFallback = false }: { children: ReactNode; eventFallback?: boolean }) => {
  const { user } = useAuth()
  const { id } = useParams()
  if (user?.role === 'organizer') return children
  if (!user) return <Navigate to="/login" replace />
  if (eventFallback && id) return <Navigate to={`/events/${id}`} replace />
  return <Navigate to="/" replace />
}

// /settings renders a different page for students and the general public
function SettingsRoute() {
  const { user } = useAuth()
  return user?.role === 'public' ? <PublicSettingsPage /> : <SettingsPage />
}

// /profile renders a different page for students and the general public
function ProfileRoute() {
  const { user } = useAuth()
  return user?.role === 'public' ? <PublicProfilePage /> : <StudentProfilePage />
}

// /events/:id/checkin renders a different page for students and the general public
function CheckinRoute() {
  const { user } = useAuth()
  return user?.role === 'public' ? <PublicCheckinPage /> : <StudentCheckinPage />
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
      <div className="flex-1 w-full max-w-2xl lg:max-w-5xl mx-auto bg-surface flex flex-col">
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
          <StudentPublicRoute>
            <HomePage />
          </StudentPublicRoute>
        }
      />
      <Route path="/browse"
        element={
          <StudentPublicRoute>
            <BrowseEventsPage />
          </StudentPublicRoute>
        }
      />
      <Route path="/select-interests"
        element={
          <StudentPublicRoute>
            <SelectInterestsPage />
          </StudentPublicRoute>
        }
      />
      <Route path="/student-onboarding"
        element={
          <StudentPublicRoute>
            <StudentOnboardingPage />
          </StudentPublicRoute>
        }
      />
      {/* open to public event details are viewable without an account */}
      <Route path="/events/:id" element={<StudentEventDetailsPage />} />
      <Route path="/events/:id/pay"
        element={
        <StudentPublicRoute>
          <MockPaymentPage />
        </StudentPublicRoute>
        }
      />
      <Route path="/events/:id/checkin"
        element={
        <StudentPublicRoute>
          <CheckinRoute />
        </StudentPublicRoute>
        }
      />
      <Route path="/events/:id/feedback"
        element={
        <StudentPublicRoute>
          <StudentFeedbackPage />
        </StudentPublicRoute>
        }
      />
      <Route path="/profile"
        element={
        <StudentPublicRoute>
          <ProfileRoute />
        </StudentPublicRoute>
        }
      />
      <Route path="/my-events"
        element={
        <StudentPublicRoute>
          <MyEventsPage />
        </StudentPublicRoute>
        }
      />
      <Route path="/settings"
        element={
          <StudentPublicRoute>
            <SettingsRoute />
          </StudentPublicRoute>
        }
      />
      <Route path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route path="/notifications"
        element={
          <StudentPublicRoute>
            <NotificationsPage />
          </StudentPublicRoute>
        }
      />
      {/* viewable without a token so guests get a login prompt, access is enforced server-side */}
      <Route path="/organizers/:id" element={<OrganizerProfilePage />} />
      <Route path="/login/organizer" element={<OrganizerLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/login/organizer/register" element={<OrganizerCreateAccount />} />
      <Route path="/organizer/dashboard"
        element={
        <OrganizerRoute>
          <OrganizerProfilePage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/profile"
        element={
        <OrganizerRoute>
          <OrganizerEditProfilePage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events"
        element={
        <OrganizerRoute>
          <OrganizerEventsPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events/new"
        element={
        <OrganizerRoute>
          <OrganizerCreateEventPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events/:id"
        element={
        <OrganizerRoute eventFallback>
          <OrganizerEventDetailsPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events/:id/edit"
        element={
        <OrganizerRoute>
          <OrganizerEditEventPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events/:id/checkin"
        element={
        <OrganizerRoute>
          <OrganizerCheckinScannerPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events/:id/participants"
        element={
        <OrganizerRoute>
          <OrganizerParticipantsPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events/:id/feedback-form"
        element={
        <OrganizerRoute>
          <OrganizerFeedbackFormPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/feedback-form/new"
        element={
        <OrganizerRoute>
          <OrganizerFeedbackFormPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/analytics"
        element={
        <OrganizerRoute>
          <OrganizerAnalyticsPage />
        </OrganizerRoute>
        }
      />
      <Route path="/organizer/events/:id/analytics"
        element={
        <OrganizerRoute>
          <OrganizerEventAnalyticsPage />
        </OrganizerRoute>
        }
      />
      <Route path="/login/public" element={<PublicLoginPage />} />
      <Route path="/login/public/register" element={<PublicCreateAccount />} />
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