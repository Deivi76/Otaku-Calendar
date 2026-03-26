import Link from 'next/link';

const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const MOCK_EVENTS = [
  { anime: 'Dragon Ball DAIMA', episode: 3, day: 1, type: 'confirmed' },
  { anime: 'One Piece', episode: 1123, day: 1, type: 'confirmed' },
  { anime: 'Bleach: Thousand-Year Blood War', episode: 4, day: 2, type: 'confirmed' },
  { anime: 'Naruto', episode: 1, day: 3, type: 'announcement' },
  { anime: 'Demon Slayer', episode: 12, day: 4, type: 'confirmed' },
  { anime: 'Jujutsu Kaisen', episode: 1, day: 5, type: 'rumor' },
  { anime: 'New Project', episode: null, day: 5, type: 'announcement' },
  { anime: 'Live Action Test', episode: null, day: 6, type: 'live_action' },
];

export default function Home() {
  const today = new Date().getDay();
  
  const getEventsForDay = (dayIndex: number) => {
    return MOCK_EVENTS.filter(e => e.day === dayIndex);
  };

  return (
    <main className="container">
      <header className="header">
        <Link href="/" className="logo">Otaku Calendar</Link>
        <nav className="nav">
          <Link href="/">Calendário</Link>
          <Link href="/radar">Radar Otaku</Link>
          <Link href="/favorites">Favoritos</Link>
          <button className="login-btn">Login</button>
        </nav>
      </header>

      <section style={{ padding: '2rem 0' }}>
        <h1 style={{ marginBottom: '1rem' }}>Calendário Semanal</h1>
        
        <div className="week-grid">
          {DAYS.map((day, index) => (
            <div key={day} className="day-column">
              <div className={`day-header ${index === today ? 'today' : ''}`}>
                {day}
              </div>
              <div className="day-content">
                {getEventsForDay(index).map((event, i) => (
                  <div key={i} className={`episode-card ${event.type}`}>
                    <div className="episode-title">{event.anime}</div>
                    {event.episode && (
                      <div className="episode-number">
                        Episódio {event.episode}
                      </div>
                    )}
                    {event.type !== 'confirmed' && (
                      <span className={`badge ${event.type}`}>
                        {event.type === 'rumor' && '🧪 Rumor'}
                        {event.type === 'announcement' && '📢 Anúncio'}
                        {event.type === 'live_action' && '🎬 Live Action'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
