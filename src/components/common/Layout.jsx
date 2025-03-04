import Sidebar from './Sidebar'
import { useAuth } from '../../contexts/AuthContext'

export default function Layout({ children }) {
  const { loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="flex flex-row h-screen w-full overflow-hidden bg-white">
      {/* Slim sidebar */}
      <div className="flex-none w-16">
        <Sidebar />
      </div>
      
      {/* Main Content - takes nearly full width */}
      <div className="flex-grow overflow-y-auto">
        <main className="py-6 px-6 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
