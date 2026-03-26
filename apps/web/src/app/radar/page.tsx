'use client';

import { useState } from 'react';

const MOCK_RUMORS = [
  { anime: 'New Dragon Ball Project', type: 'rumor', confidence: 'medium' },
  { anime: 'Naruto Sequel Announcement', type: 'rumor', confidence: 'low' },
];

const MOCK_ANNOUNCEMENTS = [
  { anime: 'Bleach: New Arc', type: 'announcement' },
  { anime: 'New Studio Trigger Project', type: 'announcement' },
];

const MOCK_LIVE_ACTIONS = [
  { anime: 'One Piece Live Action S2', type: 'live_action' },
  { anime: 'Avatar: The Last Airbender', type: 'live_action' },
];

export default function Radar() {
  const [activeTab, setActiveTab] = useState<'rumor' | 'announcement' | 'live_action'>('rumor');

  const items = {
    rumor: MOCK_RUMORS,
    announcement: MOCK_ANNOUNCEMENTS,
    live_action: MOCK_LIVE_ACTIONS,
  };

  return (
    <main className="container">
      <header className="header">
        <a href="/" className="logo">Otaku Calendar</a>
        <nav className="nav">
          <a href="/">Calendário</a>
          <a href="/radar">Radar Otaku</a>
          <a href="/favorites">Favoritos</a>
          <button className="login-btn">Login</button>
        </nav>
      </header>

      <section style={{ padding: '2rem 0' }}>
        <h1 style={{ marginBottom: '1rem' }}>Radar Otaku</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Fique por dentro dos últimos rumores, anúncios e adaptações live action.
        </p>

        <div className="radar-tabs">
          <button 
            className={`radar-tab ${activeTab === 'rumor' ? 'active' : ''}`}
            onClick={() => setActiveTab('rumor')}
          >
            🧪 Rumores
          </button>
          <button 
            className={`radar-tab ${activeTab === 'announcement' ? 'active' : ''}`}
            onClick={() => setActiveTab('announcement')}
          >
            📢 Anúncios
          </button>
          <button 
            className={`radar-tab ${activeTab === 'live_action' ? 'active' : ''}`}
            onClick={() => setActiveTab('live_action')}
          >
            🎬 Live Actions
          </button>
        </div>

        <div className="week-grid">
          {items[activeTab].map((item: any, i: number) => (
            <div key={i} className={`episode-card ${item.type}`}>
              <div className="episode-title">{item.anime}</div>
              {item.confidence && (
                <div className="episode-number">
                  Confiança: {item.confidence}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
