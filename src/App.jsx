// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import PlaylistBuilder from './pages/PlaylistBuilder'
import PlaylistEditor from './pages/PlaylistEditor'
import TranscriptSummary from './pages/TranscriptSummary'
import SearchPage from './pages/SearchPage'
import InterviewPlayer from './pages/InterviewPlayer'
import ClipPlayer from './pages/ClipPlayer'
import ContentDirectory from './pages/ContentDirectory'
import BasicFlow from './examples/BasicFlow'
import VectorSearchPage from './pages/VectorSearchPage'


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

      <Route path="/content-directory" element={
        <ProtectedRoute>
          <Layout>
            <ContentDirectory />
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

      <Route path="/search" element={
        <ProtectedRoute>
          <Layout>
            <SearchPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/semantic-search" element={
        <ProtectedRoute>
          <Layout>
            <VectorSearchPage />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/interview-player" element={
        <ProtectedRoute>
          <Layout>
            <InterviewPlayer />
          </Layout>
        </ProtectedRoute>
      } />

      <Route
        path="/clip-player"
        element={
          <ProtectedRoute>
            <Layout>
              <ClipPlayer />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/examples/basic-flow" element={
        <ProtectedRoute>
          <Layout>
            <BasicFlow />
          </Layout>
        </ProtectedRoute>
      } />

      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}