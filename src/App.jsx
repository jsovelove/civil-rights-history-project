// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import PlaylistBuilder from './pages/PlaylistBuilder'
import PlaylistEditor from './pages/PlaylistEditor'
import KeywordDirectory from './pages/KeywordDirectory'
import TranscriptSummary from './pages/TranscriptSummary'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Home />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/playlist-builder" element={
        <ProtectedRoute>
          <Layout>
            <PlaylistBuilder />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/playlist-editor" element={
        <ProtectedRoute>
          <Layout>
            <PlaylistEditor />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/keyword-directory" element={
        <ProtectedRoute>
          <Layout>
            <KeywordDirectory />
          </Layout>
        </ProtectedRoute>
      } />
      
      <Route path="/transcript-summary" element={
        <ProtectedRoute>
          <Layout>
            <TranscriptSummary />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}