const MOCK_ANIME = {
  id: '1',
  title: 'Dragon Ball DAIMA',
  title_japanese: 'ドラゴンボールDAIMA',
  images: {
    jpg: {
      image_url: 'https://cdn.myanimelist.net/images/anime/1805/141944.jpg',
      large_image_url: 'https://cdn.myanimelist.net/images/anime/1805/141944l.jpg',
    },
  },
  episodes: 0,
  status: 'Currently Airing',
  airing: true,
  score: 8.5,
  synopsis: 'A new Dragon Ball series featuring Goku and friends in a new adventure.',
  genres: [{ name: 'Action' }, { name: 'Adventure' }, { name: 'Comedy' }],
  studios: [{ name: 'Toei Animation' }],
};

const MOCK_EPISODES = [
  { number: 1, title: 'The New Adventure Begins', aired: '2024-10-11', watched: true },
  { number: 2, title: 'Goku Transforms', aired: '2024-10-18', watched: true },
  { number: 3, title: 'The Enemy Appears', aired: '2024-10-25', watched: false },
  { number: 4, title: 'Battle in the Dark', aired: '2024-11-01', watched: false },
];

import Link from 'next/link';

export default function AnimePage({ params }: { params: { id: string } }) {
  const anime = MOCK_ANIME;
  const episodes = MOCK_EPISODES;

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

      <section className="anime-page">
        <div>
          <img 
            src={anime.images.jpg.large_image_url} 
            alt={anime.title}
            className="anime-cover"
          />
        </div>
        
        <div className="anime-info">
          <h1>{anime.title}</h1>
          <p className="anime-meta">{anime.title_japanese}</p>
          
          <div style={{ marginBottom: '1rem' }}>
            {anime.genres.map((g: any) => (
              <span key={g.name} style={{ 
                marginRight: '0.5rem', 
                padding: '0.25rem 0.5rem',
                background: 'var(--bg-tertiary)',
                borderRadius: '4px',
                fontSize: '0.8rem',
              }}>
                {g.name}
              </span>
            ))}
          </div>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            {anime.synopsis}
          </p>
          
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            <p>Estúdio: {anime.studios.map((s: any) => s.name).join(', ')}</p>
            <p>Status: {anime.status}</p>
            <p>Nota: {anime.score}</p>
          </div>
          
          <button 
            className="login-btn" 
            style={{ marginTop: '1rem' }}
          >
            ❤️ Adicionar aos Favoritos
          </button>
        </div>
      </section>
      
      <section style={{ paddingBottom: '2rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>Episódios</h2>
        <div className="episode-list">
          {episodes.map((ep: any) => (
            <div key={ep.number} className={`episode-item ${ep.watched ? 'watched' : ''}`}>
              <div>
                <strong>Episódio {ep.number}</strong>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {ep.title} • {ep.aired}
                </p>
              </div>
              <button className={`watch-btn ${ep.watched ? 'watched' : ''}`}>
                {ep.watched ? '✓ Assistido' : 'Marcar'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
