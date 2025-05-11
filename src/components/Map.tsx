import React, { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../styles/Map.css';

// Решение проблемы с иконками в React+Leaflet
// https://github.com/PaulLeCam/react-leaflet/issues/453
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Кастомные иконки
const engineerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const clientIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Location {
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type: 'engineer' | 'client';
}

interface LocationMapProps {
  locations: Location[];
  center?: [number, number];
  zoom?: number;
  height?: string;
}

const LocationMap: React.FC<LocationMapProps> = ({ 
  locations, 
  center = [55.7522, 37.6156], // Москва по умолчанию
  zoom = 10,
  height = '500px'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    // Инициализация карты при монтировании компонента
    if (!mapRef.current) return;

    // Если карта уже существует, очищаем ее перед новой инициализацией
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
    }
    
    // Создаем новую карту
    const map = L.map(mapRef.current).setView(center, zoom);
    mapInstanceRef.current = map;

    // Добавляем тайлы OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Добавляем маркеры для всех локаций
    locations.forEach(location => {
      const marker = L.marker([location.lat, location.lng], {
        icon: location.type === 'engineer' ? engineerIcon : clientIcon
      }).addTo(map);

      // Добавляем попап с информацией
      marker.bindPopup(`
        <div>
          <h3>${location.title}</h3>
          ${location.description ? `<p>${location.description}</p>` : ''}
          <p>Координаты: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}</p>
        </div>
      `);
    });

    // Очистка при размонтировании
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [locations, center, zoom]); // Перегенерировать карту при изменении этих пропсов

  return (
    <div className="map-container" style={{ height }}>
      <div ref={mapRef} style={{ height: '100%', width: '100%' }}></div>
    </div>
  );
};

export default LocationMap; 