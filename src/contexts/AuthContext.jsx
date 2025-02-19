// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { auth } from '../services/firebase'

// Create context
const AuthContext = createContext()

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth listener");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? user.email : "No user");
      setUser(user)
      setLoading(false)
    }, (error) => {
      console.error("Auth state change error:", error);
      setError(error.message)
      setLoading(false)
    })

    // Cleanup subscription
    return () => unsubscribe()
  }, [])

  // Login function
  const login = async (email, password) => {
    try {
      setError(null)
      console.log("Attempting login with:", email);
      const result = await signInWithEmailAndPassword(auth, email, password)
      setUser(result.user)
      return result.user
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message)
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    try {
      setError(null)
      console.log("Logging out user");
      await firebaseSignOut(auth)
      setUser(null)
    } catch (error) {
      console.error("Logout error:", error);
      setError(error.message)
      throw error
    }
  }

  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}