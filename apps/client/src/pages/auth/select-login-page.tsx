import { useNavigate } from 'react-router-dom'
import LoginFooter from '../../components/login-footer'

export default function SelectLoginPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      
      {/* Logos */}
      <div className="w-full flex justify-center pt-8">
        <img
          src="/SU SC Logo.png"
          alt="Sunway University and Sunway College"
          className="h-12 w-auto object-contain"
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        
        <h1 className="text-primary text-2xl font-bold mb-10 text-center tracking-tight">
          Sunway <span className="text-accent">MyEvents</span>
        </h1>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow p-6 w-full max-w-sm flex flex-col">
          
          <label className="block text-lg font-medium text-gray-700 mb-6">
            Log in as
          </label>

          <div className="flex flex-col gap-4">
            <button
              onClick={() => navigate('/login/student')}
              className="w-full bg-primary text-white font-semibold py-3 rounded-lg text-sm"
            >
              General Sunway Student
            </button>

            <button
              onClick={() => navigate('/login/organizer')}
              className="w-full bg-accent text-white font-semibold py-3 rounded-lg text-sm"
            >
              Organizer (SLB / C&S)
            </button>
          </div>
          
        </div>
      </div>

      <LoginFooter />

    </div>
  )
}