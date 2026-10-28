import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';
import L from 'leaflet';

// Leaflet 1.9.4 のCDNを使用し、アイコン設定を定義（プロトタイプ汚染を排除）
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Ratings {
  richness: number;
  spiciness: number;
  flavor: number;
  numbness: number;
  cospa: number;
}

interface MaboStore {
  id: number;
  rank: number | null;
  storeName: string;
  lat: number;
  lng: number;
  image: string;
  notes: string;
  review: string;
  ratings: Ratings;
}

function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.closePopup();
      map.setView(center, 16);
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    }
  }, [center, map]);
  return null;
}

function App() {
  const [stores, setStores] = useState<MaboStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<MaboStore | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(window.innerWidth < 768);

  // ウィンドウのリサイズイベントを監視し、モバイル判定を動的に更新
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initialZoom = isMobile ? 4 : 5;
  const initialCenter: [number, number] = isMobile ? [37.5, 140.0] : [38.5, 133.0];
  const mapHeight = isMobile ? '320px' : '450px';

  useEffect(() => {
    fetch('./data/mabo.json')
      .then(res => res.json())
      .then(data => setStores(data))
      .catch(err => console.error("Failed to load map data:", err));
  }, []);

  const getChartData = (ratings: Ratings) => [
    { subject: 'コクの深さ', score: ratings.richness, fullMark: 5 },
    { subject: '辛さ', score: ratings.spiciness, fullMark: 5 },
    { subject: '風味と食感', score: ratings.flavor, fullMark: 5 },
    { subject: '痺れ', score: ratings.numbness, fullMark: 5 },
    { subject: 'コスパ', score: ratings.cospa, fullMark: 5 },
  ];

  return (
    <div className="app-container">
      <header>
        <h1>オススメ麻婆豆腐 マップ＆レビュー</h1>
        更新日：2026年10月27日　　総店舗数：36
      </header>

      <div className="map-section relative-container">
        <div className="ranking-overlay">
          <h3>🏆 おすすめランキング</h3>
          <ul className="ranking-list">
            {stores
              .filter(store => store.rank !== null && store.rank <= 5)
              .sort((a, b) => (a.rank || 0) - (b.rank || 0))
              .map((store) => (
                <li
                  key={store.id}
                  className={selectedStore?.id === store.id ? 'active' : ''}
                  onClick={() => setSelectedStore(store)}
                >
                  <span className="rank-badge">{store.rank}位</span>
                  <span className="store-name-text">{store.storeName}</span>
                </li>
              ))}
          </ul>
        </div>

        <MapContainer 
          center={initialCenter} 
          zoom={initialZoom} 
          style={{ height: mapHeight, width: '100%' }}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={selectedStore ? [selectedStore.lat, selectedStore.lng] : null} />
          
          {stores.map(store => (
            <Marker 
              key={store.id} 
              position={[store.lat, store.lng]} 
              icon={defaultIcon} /* プロパティとしてアイコンを直接指定 */
              eventHandlers={{ click: () => setSelectedStore(store) }}
            >
              <Popup><strong>{store.storeName}</strong></Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <main className="review-section">
        {selectedStore ? (
          <article className="review-card">
            <div className="review-header">
              <h2>{selectedStore.storeName}</h2>
                {selectedStore.rank !== null && selectedStore.rank <= 5 && (
                  <span className="rank-label">おすすめ第{selectedStore.rank}位</span>
                )}
            </div>
            
            <div className="review-body">
              <div className="review-content">
                <img src={selectedStore.image} alt={selectedStore.storeName} className="store-image" />
                <div className="notes-box">
                  <strong>⚠️ 注意事項</strong>
                  <p>{selectedStore.notes}</p>
                </div>
                <div className="review-text">
                  <strong>📝 レビュー</strong>
                  <p>{selectedStore.review}</p>
                </div>
              </div>

              <div className="chart-container">
                <h3>評価チャート</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getChartData(selectedStore.ratings)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#333', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} />
                    <Radar name="評価" dataKey="score" stroke="#d32f2f" fill="#d32f2f" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <button className="close-btn" onClick={() => setSelectedStore(null)}>閉じる</button>
          </article>
        ) : (
          <div className="placeholder">
            <p>地図のピン、またはランキングのお店をクリックして詳細を確認してください！</p>
          </div>
        )}
        <section className="profile-container">
          <div className="profile-card">
            <div className="profile-avatar">
              <img src="./images/icon.png" alt="T.Yamaguchiのアイコン" />
            </div>
            <div className="profile-info">
              <h3>作成者: T.Yamaguchi</h3>
              <p className="profile-bio">
                麻婆豆腐の「辛さ」「痺れ」と「コク」を求めて…。
                職業はシステムエンジニアで、趣味は登山です。
              </p>
              <div className="profile-links">
                <a 
                  href="https://www.credly.com/users/tyamaguchi.7471ef8e" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="credly-link"
                >
                  🏅 Credly プロフィールを見る
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer style={{ textAlign: 'center', padding: '10px', fontSize: '0.8rem', color: '#777' }}>
        Map data © OpenStreetMap contributors
      </footer>
    </div>
  );
}

export default App;