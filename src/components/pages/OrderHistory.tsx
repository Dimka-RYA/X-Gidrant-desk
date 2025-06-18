import React, { useEffect, useState } from 'react';
import { auth, db } from '../../assets/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import '../../styles/pages/OrderHistory.css';

// Основная функция истории заказов пользователя
const OrderHistory: React.FC = () => {
  // orders — список заказов пользователя
  const [orders, setOrders] = useState<any[]>([]);
  // loading — идёт ли сейчас загрузка
  const [loading, setLoading] = useState(true);
  // error — текст ошибки, если есть
  const [error, setError] = useState<string | null>(null);

  // Загружаем историю заказов при первом рендере
  useEffect(() => {
    const fetchOrders = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("Для просмотра истории заказов необходимо войти в систему.");
        setLoading(false);
        return;
      }

      try {
        // Получаем все заказы текущего пользователя
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef,
          where('userId', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        console.log(`Найдено ${querySnapshot.size} заказов`);
        
        // Преобразуем в массив и сохраняем
        const ordersData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`Заказ ${doc.id}:`, data);
          return {
            id: doc.id,
            ...data
          };
        });
        
        setOrders(ordersData);
      } catch (err) {
        console.error("Ошибка при загрузке заказов:", err);
        setError("Не удалось загрузить историю заказов. Пожалуйста, попробуйте еще раз.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Форматирование даты из Timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Дата неизвестна";
    
    try {
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString();
      } else if (timestamp instanceof Date) {
        return timestamp.toLocaleString();
      } else {
        return "Дата неизвестна";
      }
    } catch (error) {
      return "Дата неизвестна";
    }
  };

  // Форматирование цены
  const formatPrice = (price: any, currency: string = 'руб.') => {
    // Если цена не определена или не является числом, возвращаем "по согласованию"
    if (price === undefined || price === null) {
      return "0";
    }
    
    // Преобразуем к числу если это строка
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Если цена равна 0 или NaN, возвращаем "по согласованию"
    if (isNaN(numericPrice) || numericPrice === 0) {
      return "0";
    }
    
    // Форматируем число с разделителями тысяч
    return `${numericPrice.toLocaleString('ru-RU')} ${currency}`;
  };

  // Если идёт загрузка — показываем сообщение
  if (loading) {
    return <div className="order-history-loading">Загрузка истории заказов...</div>;
  }

  // Если произошла ошибка — показываем ошибку
  if (error) {
    return <div className="order-history-error">{error}</div>;
  }

  // Возвращаем разметку истории заказов
  return (
    <div className="order-history-container">
      <h2>История Ваших Заказов</h2>
      {orders.length === 0 ? (
        <p>У вас пока нет оформленных заказов.</p>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <h3>{order.title || order.serviceTitle || "Заказ"}</h3>
              <p>Статус: <span className={`order-status ${(order.status || "").toLowerCase().replace(' ', '-')}`}>{order.status || "В обработке"}</span></p>
              <p>Цена: {formatPrice(order.price, order.currency)}</p>
              <p>Дата: {formatDate(order.createdAt || order.timestamp)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory; 