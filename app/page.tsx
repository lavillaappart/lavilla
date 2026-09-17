import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>WebAnas</h1>
      <p>Plateforme web de location d'appartements.</p>
      <p>Base connectée à Supabase et prête pour Vercel.</p>
      <Link href="/appartements">Voir les appartements</Link>
    </main>
  );
}
