import React, { useEffect, useState } from 'react';
import { auth, db } from '../../assets/firebase';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import '../../styles/pages/OrderHistory.css';

interface Order {
  id: string;
  serviceTitle: string;
  timestamp: Timestamp;
  status: string;
  price?: number;
  currency?: string;
}

const OrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      const user = auth.currentUser;
      if (!user) {
        setError("Для просмотра истории заказов необходимо войти в систему.");
        setLoading(false);
        return;
      }

      try {
        const ordersCollectionRef = collection(db, 'orders');
        const q = query(
          ordersCollectionRef,
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc') // Order by latest orders first
        );
        const querySnapshot = await getDocs(q);
        const fetchedOrders: Order[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          serviceTitle: doc.data().serviceTitle,
          timestamp: doc.data().timestamp as Timestamp,
          status: doc.data().status,
          price: doc.data().price || 0,
          currency: doc.data().currency || 'руб.',
        }));
        setOrders(fetchedOrders);
      } catch (err) {
        console.error("Error fetching order history:", err);
        setError("Не удалось загрузить историю заказов. Пожалуйста, попробуйте еще раз.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div className="order-history-loading">Загрузка истории заказов...</div>;
  }

  if (error) {
    return <div className="order-history-error">{error}</div>;
  }

  return (
    <div className="order-history-container">
      <h2>История Ваших Заказов</h2>
      {orders.length === 0 ? (
        <p>У вас пока нет оформленных заказов.</p>
      ) : (
        <div className="order-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <h3>{order.serviceTitle}</h3>
              <p>Статус: <span className={`order-status ${order.status.toLowerCase().replace(' ', '-')}`}>{order.status}</span></p>
              {order.price !== undefined && (
                <p>Цена: {order.price} {order.currency}</p>
              )}
              <p>Дата: {new Date(order.timestamp.seconds * 1000).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderHistory; 