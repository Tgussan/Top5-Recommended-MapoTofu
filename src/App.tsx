import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import 'leaflet/dist/leaflet.css';
import './App.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Leaflet公式のCDNから直接青いピンの画像を読み込みます
const defaultIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = defaultIcon;

// TypeScriptの型定義
interface Ratings {
  richness: number;   // コクの深さ
  spiciness: number;  // 辛さ
  flavor: number;     // 風味と食感
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

// 店詳細をクリックしたときにスーッと移動するコントローラー
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
    
      // ★重要：地図移動の前に、現在開いているポップアップ（吹き出し）をすべて強制的に閉じます
      // これにより、Leafletの画面ロックが解除され、他県へのジャンプが阻害されなくなります
      map.closePopup();
    
      // 1. まず指定の場所に正確に中心を合わせる
      map.setView(center, 16);
      // 2. その後、確実に描画を更新させるために少しだけ強制リフレッシュをかける
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

  // ★追加：ブラウザの横幅が768px未満ならスマホと判定
  const isMobile = window.innerWidth < 768;
  
  // スマホならズームを「4（広域）」、PCなら「5（詳細）」にする
  const initialZoom = isMobile ? 4 : 5;
  // スマホなら日本全体が見えるように中心を少し北（新潟付近）にずらす before 37.5 138.4
  const initialCenter: [number, number] = isMobile ? [37.5, 140.0] : [38.5, 133.0];

  // ★追加：スマホなら320px、PCなら450pxと、ここで確実に高さを固定します
  const mapHeight = isMobile ? '320px' : '450px';

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
    { subject: '風味と食感', score: ratings.flavor, fullMark: 5 },
    { subject: '痺れ', score: ratings.numbness, fullMark: 5 },
    { subject: 'コスパ', score: ratings.cospa, fullMark: 5 },
  ];

  return (
    <div className="app-container">
      <header>
        <h1>オススメ麻婆豆腐 マップ＆レビュー</h1>
      </header>

      <div className="map-section relative-container">
        {/* ランキングのオーバーレイ表示（地図の左上） */}
        <div className="ranking-overlay">
          <h3>🏆 おすすめランキング</h3>
          <ul className="ranking-list">
            {stores
              /* ★ 1位〜5位のお店だけに絞り込み、順位順に並び替える */
              .filter(store => store.rank && store.rank <= 5)
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

        {/* ★修正：styleの指定を以下のように書き換えます */}
        <MapContainer 
          center={initialCenter} 
          zoom={initialZoom} 
          style={{ height: mapHeight, width: '100%' }} /* 高さを変数（mapHeight）に */
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapController center={selectedStore ? [selectedStore.lat, selectedStore.lng] : null} />
          
          {stores.map(store => (
            <Marker key={store.id} position={[store.lat, store.lng]} eventHandlers={{ click: () => setSelectedStore(store) }}>
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
                {/* ★ 1〜5位のときだけ右側に「〇位」のラベルを表示する */}
                {selectedStore.rank && selectedStore.rank <= 5 && (
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
