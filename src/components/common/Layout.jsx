import { useAuth } from '../../contexts/AuthContext'
import Header from './Header'

export default function Layout({ children }) {
  const { loading } = useAuth()
  
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  return (
    <div className="h-screen w-full bg-white font-body flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
