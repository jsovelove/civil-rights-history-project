import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VisualizationContainer from '../components/visualization/VisualizationContainer.jsx';

export default function Home() {
  // Set default active tab to "timeline"
  const [activeTab, setActiveTab] = useState('timeline');
  const { user } = useAuth();

  // Reorder the tab array so that "timeline" is first.
  const tabs = ['timeline', 'keywords', 'map', 'people'];

  return (
    <div style={{
      maxWidth: '1280px',
      margin: '0 auto',
      padding: '24px',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px'
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          background: 'linear-gradient(to right, #2563eb, #4f46e5)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          color: 'transparent',
          margin: '0 0 24px 0'
        }}>
          Civil Rights History Project
        </h1>
      </div>

      {/* Visualization Section */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        marginBottom: '24px'
      }}>
        {/* Tabs */}
        <div style={{
          borderBottom: '1px solid #e5e7eb'
        }}>
          <ul style={{
            display: 'flex',
            flexWrap: 'wrap',
            margin: 0,
            padding: 0,
            listStyle: 'none'
          }}>
            {tabs.map((tab) => (
              <li key={tab} style={{
                flex: '1'
              }}>
                <button
                  onClick={() => setActiveTab(tab)}
                  style={{
                    width: '100%',
                    padding: '16px 4px',
                    fontSize: '15px',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    backgroundColor: activeTab === tab ? '#eef2ff' : 'transparent',
                    color: activeTab === tab ? '#1e40af' : '#6b7280',
                    fontWeight: activeTab === tab ? '600' : '400',
                    borderBottom: activeTab === tab ? '2px solid #2563eb' : 'none',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Render the active visualization */}
        <div style={{
          padding: '24px'
        }}>
          <VisualizationContainer activeVisualization={activeTab} />
        </div>
      </div>
    </div>
  );
}