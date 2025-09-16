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
    <div className="min-h-screen w-full font-body" style={{ backgroundColor: '#EBEAE9' }}>
      <Header />
      <main className="w-full">
        {children}
      </main>
    </div>
  )
}
