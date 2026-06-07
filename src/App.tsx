import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// マーカーアイコンの初期設定
L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

// TypeScriptの型定義
interface Ratings {
  richness: number;   // コクの深さ
  spiciness: number;  // 辛さ
  flavor: number;     // 香辛料の風味&食感
  numbness: number;   // 痺れ
  cospa: number;      // コスパ
}

interface MaboStore {
  id: number;
  rank: number | null; // 1~5位。nullならランキング外
  storeName: string;
  lat: number;
  lng: number;
  image: string;
  notes: string;
  review: string;
  ratings: Ratings;
}

// 地図の中心を動かすためのヘルパーコンポーネント
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

function App() {
  const [stores, setStores] = useState<MaboStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<MaboStore | null>(null);

  useEffect(() => {
    // データの読み込み
    fetch('./data/mabo.json')
      .then(res => res.json())
      .then(data => setStores(data));
  }, []);

  // ランキング順（1〜5位）にフィルタリング＆ソート
  const rankingStores = stores
    .filter(store => store.rank !== null && store.rank <= 5)
    .sort((a, b) => (a.rank || 99) - (b.rank || 99));

  // レーダーチャート用のデータ成形関数
  const getChartData = (ratings: Ratings) => [
    { subject: 'コクの深さ', score: ratings.richness, fullMark: 5 },
    { subject: '辛さ', score: ratings.spiciness, fullMark: 5 },
    { subject: '香辛料の風味&食感', score: ratings.flavor, fullMark: 5 },
    { subject: '痺れ', score: ratings.numbness, fullMark: 5 },
    { subject: 'コスパ', score: ratings.cospa, fullMark: 5 },
  ];

  return (
    <div className="app-container">
      <header>
        <h1>至高の麻婆豆腐 マップ＆レビュー</h1>
      </header>

      <div className="map-section relative-container">
        {/* ランキングのオーバーレイ表示（地図の左上） */}
        <div className="ranking-overlay">
          <h3>🏆 おすすめランキング</h3>
          <ul className="ranking-list">
            {rankingStores.map(store => (
              <li 
                key={store.id} 
                onClick={() => setSelectedStore(store)}
                className={selectedStore?.id === store.id ? 'active' : ''}
              >
                <span className="rank-badge">{store.rank}位</span> {store.storeName}
              </li>
            ))}
          </ul>
        </div>

        {/* 地図コンポーネント */}
        <MapContainer center={[36.0, 138.0]} zoom={5} style={{ height: '450px', width: '100%' }} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={selectedStore ? [selectedStore.lat, selectedStore.lng] : null} />
          {stores.map(store => (
            <Marker 
              key={store.id} 
              position={[store.lat, store.lng]} 
              eventHandlers={{ click: () => setSelectedStore(store) }}
            >
              <Popup>
                <strong>{store.storeName}</strong>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <main className="review-section">
        {selectedStore ? (
          <article className="review-card">
            <div className="review-header">
              <h2>{selectedStore.storeName}</h2>
              {selectedStore.rank && <span className="rank-label">おすすめ第{selectedStore.rank}位</span>}
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

              {/* レーダーチャート */}
              <div className="chart-container">
                <h3>評価チャート</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getChartData(selectedStore.ratings)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#333', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} />
                    {/* 麻婆豆腐をイメージした赤系のカラー設定 */}
                    <Radar name="評価" dataKey="score" stroke="#d32f2f" fill="#d32f2f" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <button className="close-btn" onClick={() => setSelectedStore(null)}>閉じる</button>
          </article>
        ) : (
          <div className="placeholder">
            <p>地図のピン、またはランキングのお店をクリックして詳細を確認してください🍜</p>
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
                麻婆豆腐の「辛さ」「痺れ」と「コク」を求めて全国を旅するエンジニア。
                趣味は登山です。
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
