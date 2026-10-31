import LiveDashboard from '@/components/LiveDashboard';

// Sayfa statik bir kabuk olarak sunulur; veri tarayıcıdan /api/earthquakes
// (CDN'de 30 sn önbellekli) ile çekilir ve EMSC canlı akışıyla güncellenir.
export default function Home() {
  return <LiveDashboard initial={null} />;
}
