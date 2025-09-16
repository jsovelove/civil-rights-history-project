// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/common/Layout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Home from './pages/Home'
import Visualizations from './pages/Visualizations'
import Login from './pages/Login'
import PlaylistBuilder from './pages/PlaylistBuilder'
import PlaylistEditor from './pages/PlaylistEditor'
import SearchPage from './pages/SearchPage'
import InterviewPlayer from './pages/InterviewPlayer'
import ClipPlayer from './pages/ClipPlayer'
import ContentDirectory from './pages/ContentDirectory'
import TopicGlossary from './pages/TopicGlossary'
import InterviewIndex from './pages/InterviewIndex'
import About from './pages/About'



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

      <Route path="/visualizations" element={
        <ProtectedRoute>
          <Layout>
            <Visualizations />
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

      <Route path="/interview-index" element={
        <ProtectedRoute>
          <Layout>
            <InterviewIndex />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/topic-glossary" element={
        <ProtectedRoute>
          <Layout>
            <TopicGlossary />
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

      <Route path="/about" element={
        <ProtectedRoute>
          <Layout>
            <About />
          </Layout>
        </ProtectedRoute>
      } />

      <Route path="/interview-player" element={
        <ProtectedRoute>
          <InterviewPlayer />
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



      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}