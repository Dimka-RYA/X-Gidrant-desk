import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  Timestamp,
  serverTimestamp,
  getDoc,
  GeoPoint
} from 'firebase/firestore';
import { db } from '../../assets/firebase';
import '../../styles/pages/Orders.css';
import LocationMap from '../Map';

// Описание типа статусного события
interface StatusEvent {
  dateTime: string;
  notes: string;
  status: string;
}

// Описание типа геолокации инженера
interface EngineerLocation {
  accuracy: number;
  latitude: number;
  longitude: number;
  timestamp: number;
}

// Описание типа заказа
interface Order {
  id: string;
  title: string;
  price: number;
  status: string;
  clientName: string;
  userPhone: string;
  address: string;
  createdAt: any;
  assignedTo?: string;
  assignedToName?: string;
  description?: string;
  clientId?: string;
  reviewScore?: number;
  reviewText?: string;
  additionalInfo?: string;
  arrivalCode?: string;
  completionCode?: string;
  coordinates?: GeoPoint;
  currency?: string;
  engineerLocationAtAccept?: EngineerLocation;
  engineerLocationAtDeparture?: EngineerLocation;
  engineerLocationAtArrival?: EngineerLocation;
  engineerLocationAtWork?: EngineerLocation;
  lastUpdated?: any;
  paidAt?: any;
  paymentMethod?: string;
  paymentStatus?: string;
  statusEvents?: StatusEvent[];
  userEmail?: string;
  userName?: string;
}

// Описание типа сотрудника
interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  currentOrders?: number;
}

// Основная функция страницы заказов
const Orders: React.FC = () => {
  // Состояния
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAssigningOrder, setIsAssigningOrder] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('все');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Функция для получения имени пользователя по ID
  const fetchUserName = async (userId: string) => {
    if (!userId) return '';
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.displayName || userData.name || '';
      }
      return '';
    } catch (err) {
      console.error('Ошибка при получении имени пользователя:', err);
      return '';
    }
  };

  // Функция для форматирования способа оплаты
  const formatPaymentMethod = (method: string | undefined) => {
    if (!method) return '-';
    
    switch(method) {
      case 'QP': return 'Онлайн';
      case 'cash': return 'Наличные';
      case 'card': return 'Банковская карта';
      case 'transfer': return 'Банковский перевод';
      default: return method;
    }
  };

  // Загрузка заказов из Firestore
  useEffect(() => {
    setLoading(true);
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const ordersData: Order[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          ordersData.push({
            id: doc.id,
            title: data.title || 'Без названия',
            price: data.price || 0,
            status: data.status || 'новый',
            clientName: data.userName || data.clientName || 'Неизвестный клиент',
            userPhone: data.userPhone || data.clientPhone || 'Нет номера',
            address: data.address || 'Нет адреса',
            createdAt: data.createdAt,
            assignedTo: data.assignedTo || '',
            assignedToName: data.assignedToName || '',
            description: data.description || '',
            clientId: data.userId || data.clientId || '',
            reviewScore: data.reviewScore || 0,
            reviewText: data.reviewText || '',
            additionalInfo: data.additionalInfo || '',
            arrivalCode: data.arrivalCode || '',
            completionCode: data.completionCode || '',
            coordinates: data.coordinates,
            currency: data.currency || '',
            engineerLocationAtAccept: data.engineerLocationAtAccept,
            lastUpdated: data.lastUpdated,
            paidAt: data.paidAt,
            paymentMethod: data.paymentMethod || '',
            paymentStatus: data.paymentStatus || '',
            statusEvents: data.statusEvents || [],
            userEmail: data.userEmail || '',
            userName: data.userName || ''
          });
        });
        setOrders(ordersData);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при получении заказов:', err);
        setError('Не удалось загрузить заказы. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    }, (err) => {
      console.error('Ошибка при прослушивании заказов:', err);
      setError('Ошибка соединения с базой данных.');
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);

  // Загрузка сотрудников из Firestore
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const employeesRef = collection(db, 'users');
        const q = query(
          employeesRef,
          where('role', '==', 'engineer')
        );
        const querySnapshot = await getDocs(q);
        
        const employeesData: Employee[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          employeesData.push({
            id: doc.id,
            name: data.name || 'Неизвестный сотрудник',
            email: data.email || '',
            phone: data.phone || '',
            role: data.role || 'engineer',
            currentOrders: 0
          });
        });
        
        // Подсчитываем количество активных заказов у каждого сотрудника
        const employeesWithOrderCounts = await Promise.all(
          employeesData.map(async (employee) => {
            const orderCountQuery = query(
              collection(db, 'orders'),
              where('assignedTo', '==', employee.id),
              where('status', 'in', ['назначен', 'в процессе', 'на проверке'])
            );
            const orderCountSnapshot = await getDocs(orderCountQuery);
            return {
              ...employee,
              currentOrders: orderCountSnapshot.size
            };
          })
        );
        
        setEmployees(employeesWithOrderCounts);
      } catch (err) {
        console.error('Ошибка при получении сотрудников:', err);
        setError('Не удалось загрузить список сотрудников.');
      }
    };
    
    fetchEmployees();
  }, [orders]); // Обновляем при изменении заказов

  // Фильтрация заказов по статусу и поиску
  useEffect(() => {
    let filtered = [...orders];
    
    // Фильтр по статусу
    if (statusFilter !== 'все') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // Поиск по номеру заказа, имени клиента и адресу
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.id.toLowerCase().includes(query) ||
        order.clientName.toLowerCase().includes(query) ||
        order.address.toLowerCase().includes(query) ||
        order.title.toLowerCase().includes(query)
      );
    }
    
    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchQuery]);

  // Обработчик открытия модального окна подтверждения удаления
  const openDeleteConfirmation = (orderId: string) => {
    setOrderToDelete(orderId);
    setShowDeleteModal(true);
  };

  // Обработчик удаления заказа
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'orders', orderToDelete));
      setNotification('Заказ успешно удален');
      
      // Если удаляем открытый заказ, закрываем модальное окно деталей
      if (selectedOrder && selectedOrder.id === orderToDelete) {
        setSelectedOrder(null);
        setIsDetailsModalOpen(false);
      }
      
      // Закрываем модальное окно подтверждения
      setShowDeleteModal(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Ошибка при удалении заказа:', err);
      setNotification('Ошибка при удалении заказа');
    }
  };

  // Открытие деталей заказа
  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
    
    // Получаем имя пользователя по ID, если оно есть
    if (order.clientId) {
      const name = await fetchUserName(order.clientId);
      // Обновляем selectedOrder с полученным именем пользователя
      setSelectedOrder(prev => 
        prev ? { ...prev, userName: name } : null
      );
    }
  };

  const openEditOrder = async (order: Order) => {
    setSelectedOrder(order);
    setIsEditingOrder(true);
    setIsDetailsModalOpen(true);
    
    // Получаем имя пользователя по ID, если оно есть
    if (order.clientId) {
      const name = await fetchUserName(order.clientId);
      // Обновляем selectedOrder с полученным именем пользователя
      setSelectedOrder(prev => 
        prev ? { ...prev, userName: name } : null
      );
    }
  };

  // Обработчик обновления заказа
  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        title: selectedOrder.title,
        price: selectedOrder.price,
        status: selectedOrder.status,
        clientName: selectedOrder.clientName,
        userPhone: selectedOrder.userPhone,
        address: selectedOrder.address,
        description: selectedOrder.description || '',
        // Добавленные поля
        userName: selectedOrder.userName || '',
        userEmail: selectedOrder.userEmail || '',
        additionalInfo: selectedOrder.additionalInfo || '',
        currency: selectedOrder.currency || '₽',
        paymentMethod: selectedOrder.paymentMethod || '',
        paymentStatus: selectedOrder.paymentStatus || '',
        arrivalCode: selectedOrder.arrivalCode || '',
        completionCode: selectedOrder.completionCode || '',
        lastUpdated: serverTimestamp() // Обновляем время изменения
      });
      
      // Добавляем новое событие в историю статусов
      if (selectedOrder.statusEvents) {
        const orderRef = doc(db, 'orders', selectedOrder.id);
        const orderSnap = await getDoc(orderRef);
        
        if (orderSnap.exists()) {
          const currentData = orderSnap.data();
          const currentStatus = currentData.status;
          
          // Добавляем событие только если статус изменился
          if (currentStatus !== selectedOrder.status) {
            const updatedEvents = [
              ...(selectedOrder.statusEvents || []),
              {
                status: selectedOrder.status,
                dateTime: new Date().toLocaleString('ru-RU'),
                notes: `Статус изменен администратором`
              }
            ];
            
            await updateDoc(orderRef, {
              statusEvents: updatedEvents
            });
          }
        }
      }
      
      setNotification('Заказ успешно обновлен');
      setIsEditingOrder(false);
      setIsDetailsModalOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error('Ошибка при обновлении заказа:', err);
      setNotification('Ошибка при обновлении заказа');
    }
  };

  // Отображение статуса заказа с цветом
  const renderOrderStatus = (status: string) => {
    let statusClass = '';
    let statusText = status;
    
    switch (status) {
      case 'новый':
        statusClass = 'status-new';
        break;
      case 'назначен':
        statusClass = 'status-assigned';
        break;
      case 'принят':
        statusClass = 'status-accepted';
        break;
      case 'выехал':
        statusClass = 'status-on-way';
        break;
      case 'прибыл':
        statusClass = 'status-arrived';
        break;
      case 'работает':
        statusClass = 'status-working';
        break;
      case 'в процессе':
        statusClass = 'status-in-progress';
        break;
      case 'на проверке':
        statusClass = 'status-checking';
        break;
      case 'выполнен':
        statusClass = 'status-completed';
        break;
      case 'отменен':
        statusClass = 'status-canceled';
        break;
      default:
        statusClass = 'status-default';
    }
    
    return <span className={`status-badge ${statusClass}`}>{statusText}</span>;
  };

  // Форматируем дату (можно улучшить для разных полей)
  const formatDateOrTimestamp = (timestamp: any, format: 'dateTime' | 'dateOnly' | 'timeOnly' = 'dateTime') => {
    if (!timestamp) return 'Нет данных';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
      if (format === 'dateOnly') return date.toLocaleDateString('ru-RU');
      if (format === 'timeOnly') return date.toLocaleTimeString('ru-RU');
      return date.toLocaleString('ru-RU');
    } catch (err) {
      console.error('Ошибка при форматировании даты:', err, "Значение timestamp:", timestamp);
      return typeof timestamp === 'string' ? timestamp : 'Неверная дата';
    }
  };

  // Закрытие модального окна с деталями заказа
  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedOrder(null);
    setIsAssigningOrder(false);
    setIsEditingOrder(false);
  };

  return (
    <div className="admin-orders-page">
      <div className="page-header">
        <h1>Управление заказами</h1>
        <div className="header-controls">
          <select 
            className="status-filter" 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="все">Все заказы</option>
            <option value="новый">Новые</option>
            <option value="назначен">Назначенные</option>
            <option value="в процессе">В процессе</option>
            <option value="на проверке">На проверке</option>
            <option value="выполнен">Выполненные</option>
            <option value="отменен">Отмененные</option>
          </select>
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="Поиск заказов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-search" 
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="orders-container">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Загрузка заказов...</p>
          </div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>Заказы не найдены</p>
            {searchQuery && <p>Попробуйте изменить параметры поиска</p>}
          </div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>№ заказа</th>
                  <th>Услуга</th>
                  <th>Клиент</th>
                  <th>Адрес</th>
                  <th>Сумма</th>
                  <th>Дата</th>
                  <th>Статус</th>
                  <th>Исполнитель</th>
                  <th>Способ оплаты</th>
                  <th>Статус оплаты</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} className={order.status === 'новый' ? 'new-order' : ''}>
                    <td className="order-id">{order.id}</td>
                    <td>{order.title}</td>
                    <td>{order.clientName}</td>
                    <td className="order-address">{order.address}</td>
                    <td className="order-price">{order.price} {order.currency || "₽"}</td>
                    <td>{formatDateOrTimestamp(order.createdAt)}</td>
                    <td>{renderOrderStatus(order.status)}</td>
                    <td>{order.assignedToName || 'Не назначен'}</td>
                    <td>{order.paymentMethod ? formatPaymentMethod(order.paymentMethod) : '-'}</td>
                    <td>{order.paymentStatus || '-'}</td>
                    <td className="actions">
                      <button 
                        className="action-button view"
                        onClick={() => openOrderDetails(order)}
                        title="Посмотреть детали"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke="#383636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#383636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <button 
                        className="action-button edit" 
                        onClick={() => openEditOrder(order)} 
                        title="Редактировать заказ"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#383636" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={() => openDeleteConfirmation(order.id)}
                        title="Удалить заказ"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 6H5H21" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модальное окно с деталями заказа */}
      {isDetailsModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className={`modal-content modal-details-view ${isEditingOrder ? 'modal-form-view' : ''}`}>
            <div className="modal-header">
              <h2>{isEditingOrder ? 'Редактирование заказа' : 'Детали заказа'}</h2>
              <button className="close-button" onClick={closeDetailsModal}>×</button>
            </div>
            <div className="modal-body">
              {isEditingOrder ? (
                <div className="edit-order-form">
                  <h3>Основная информация</h3>
                  <div className="form-group">
                    <label>Услуга:</label>
                    <input type="text" value={selectedOrder!.title} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, title: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Сумма:</label>
                    <input type="number" value={selectedOrder!.price} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, price: Number(e.target.value)})} />
                  </div>
                  <div className="form-group">
                    <label>Валюта:</label>
                    <input type="text" value={selectedOrder!.currency || '₽'} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, currency: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Статус:</label>
                    <select value={selectedOrder!.status} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, status: e.target.value})}>
                      <option value="новый">Новый</option>
                      <option value="назначен">Назначен</option>
                      <option value="принят">Принят</option>
                      <option value="выехал">Выехал</option>
                      <option value="прибыл">Прибыл</option>
                      <option value="работает">Работает</option>
                      <option value="в процессе">В процессе</option>
                      <option value="на проверке">На проверке</option>
                      <option value="выполнен">Выполнен</option>
                      <option value="отменен">Отменен</option>
                    </select>
                  </div>

                  <h3>Информация о клиенте</h3>
                  <div className="form-group">
                    <label>Имя клиента:</label>
                    <input type="text" value={selectedOrder!.clientName} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, clientName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Имя пользователя (если отличается):</label>
                    <input type="text" value={selectedOrder!.userName || ''} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, userName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Телефон клиента:</label>
                    <input type="text" value={selectedOrder!.userPhone} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, userPhone: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Email клиента:</label>
                    <input type="email" value={selectedOrder!.userEmail || ''} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, userEmail: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Адрес:</label>
                    <input type="text" value={selectedOrder!.address} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, address: e.target.value})} />
                  </div>

                  <h3>Детали заказа</h3>
                  <div className="form-group">
                    <label>Описание от клиента:</label>
                    <textarea value={selectedOrder!.description || ''} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, description: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Дополнительная информация:</label>
                    <textarea value={selectedOrder!.additionalInfo || ''} onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, additionalInfo: e.target.value})} />
                  </div>
                  
                  <h3>Информация об оплате</h3>
                  <div className="form-group">
                    <label>Метод оплаты:</label>
                    <select 
                      value={selectedOrder!.paymentMethod || ''} 
                      onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, paymentMethod: e.target.value})}
                    >
                      <option value="">Не выбрано</option>
                      <option value="cash">Наличные</option>
                      <option value="card">Банковская карта</option>
                      <option value="QP">Онлайн платеж</option>
                      <option value="transfer">Банковский перевод</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Статус оплаты:</label>
                    <select 
                      value={selectedOrder!.paymentStatus || ''} 
                      onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, paymentStatus: e.target.value})}
                    >
                      <option value="">Не выбрано</option>
                      <option value="не оплачен">Не оплачен</option>
                      <option value="ожидает">Ожидает оплаты</option>
                      <option value="частично">Частично оплачен</option>
                      <option value="оплачен">Оплачен</option>
                      <option value="возврат">Возврат</option>
                    </select>
                  </div>

                  <h3>Коды авторизации</h3>
                  <div className="form-group">
                    <label>Код прибытия:</label>
                    <input 
                      type="text" 
                      value={selectedOrder!.arrivalCode || ''} 
                      onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, arrivalCode: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Код завершения:</label>
                    <input 
                      type="text" 
                      value={selectedOrder!.completionCode || ''} 
                      onChange={e => selectedOrder && setSelectedOrder({...selectedOrder, completionCode: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button className="cancel-button" onClick={() => { setIsEditingOrder(false); setIsDetailsModalOpen(false); setSelectedOrder(null); }}>Отмена</button>
                    <button className="save-button" onClick={handleUpdateOrder}>Сохранить</button>
                  </div>
                </div>
              ) : (
                <div className="order-details-view">
                  <h4>Основная информация</h4>
                  <div className="detail-grid">
                    <p><strong>ID Заказа:</strong> {selectedOrder?.id}</p>
                    <p><strong>Услуга:</strong> {selectedOrder?.title}</p>
                    <p><strong>Статус:</strong> {selectedOrder?.status && renderOrderStatus(selectedOrder.status)}</p>
                    <p><strong>Цена:</strong> {selectedOrder?.price} {selectedOrder?.currency || "₽"}</p>
                    <p><strong>Время создания:</strong> {selectedOrder?.createdAt && formatDateOrTimestamp(selectedOrder.createdAt)}</p>
                    <p><strong>Последнее обновление:</strong> {selectedOrder?.lastUpdated && formatDateOrTimestamp(selectedOrder.lastUpdated)}</p>
                  </div>

                  <h4>Клиент</h4>
                  <div className="detail-grid">
                    <p><strong>Имя из профиля:</strong> {selectedOrder?.userName || 'Неизвестно'}</p>
                    <p><strong>Имя в заказе:</strong> {selectedOrder?.clientName}</p>
                    <p><strong>Телефон:</strong> {selectedOrder?.userPhone}</p>
                    <p><strong>Email:</strong> {selectedOrder?.userEmail || 'Не указан'}</p>
                    <p><strong>Адрес:</strong> {selectedOrder?.address}</p>
                    {selectedOrder?.coordinates && <p><strong>Координаты:</strong> {selectedOrder.coordinates.latitude}, {selectedOrder.coordinates.longitude}</p>}
                  </div>
                  
                  {/* Карта с местоположением клиента */}
                  {selectedOrder?.coordinates && (
                    <div className="order-map">
                      <h4>Местоположение клиента</h4>
                      <LocationMap
                        locations={[{
                          lat: selectedOrder.coordinates.latitude,
                          lng: selectedOrder.coordinates.longitude,
                          title: `${selectedOrder.title} - ${selectedOrder.clientName}`,
                          description: `Адрес: ${selectedOrder.address}`,
                          type: 'client'
                        }]}
                        center={[selectedOrder.coordinates.latitude, selectedOrder.coordinates.longitude]}
                        zoom={14}
                        height="300px"
                      />
                    </div>
                  )}
                  
                  <h4>Детали заказа</h4>
                  <div className="detail-grid">
                    <p><strong>Описание от клиента:</strong> {selectedOrder?.description || 'Нет'}</p>
                    <p><strong>Доп. информация:</strong> {selectedOrder?.additionalInfo || 'Нет'}</p>
                  </div>

                  <h4>Исполнение и оплата</h4>
                  <div className="detail-grid">
                    <p><strong>Назначен:</strong> {selectedOrder?.assignedToName || 'Не назначен'} {selectedOrder?.assignedTo && `(ID: ${selectedOrder.assignedTo})`}</p>
                    <p><strong>Код прибытия:</strong> {selectedOrder?.arrivalCode || '-'}</p>
                    <p><strong>Код завершения:</strong> {selectedOrder?.completionCode || '-'}</p>
                    <p><strong>Метод оплаты:</strong> {selectedOrder?.paymentMethod && formatPaymentMethod(selectedOrder.paymentMethod)}</p>
                    <p><strong>Статус оплаты:</strong> {selectedOrder?.paymentStatus || '-'}</p>
                    <p><strong>Время оплаты:</strong> {selectedOrder?.paidAt && formatDateOrTimestamp(selectedOrder.paidAt)}</p>
                  </div>

                  {selectedOrder?.statusEvents && selectedOrder.statusEvents.length > 0 && (
                    <>
                      <h4>История статусов</h4>
                      <ul className="status-events-list">
                        {selectedOrder.statusEvents.map((event, index) => (
                          <li key={index} className={`status-event-item event-${event.status.toLowerCase().replace(/\s+/g, '-')}`}>
                            <span className="event-datetime">{formatDateOrTimestamp(event.dateTime)}</span> 
                            <span className="event-status">{event.status}</span>
                            {event.notes && <span className="event-notes"> – {event.notes}</span>}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {selectedOrder?.engineerLocationAtAccept && (
                    <>
                      <h4>Геолокация инженера (при принятии)</h4>
                      <div className="detail-grid">
                        <p><strong>Широта:</strong> {selectedOrder.engineerLocationAtAccept.latitude}</p>
                        <p><strong>Долгота:</strong> {selectedOrder.engineerLocationAtAccept.longitude}</p>
                        <p><strong>Точность:</strong> {selectedOrder.engineerLocationAtAccept.accuracy} м</p>
                        <p><strong>Время:</strong> {formatDateOrTimestamp(selectedOrder.engineerLocationAtAccept.timestamp)}</p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления заказа */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <div className="modal-header">
              <h2>Подтверждение удаления</h2>
              <button className="close-button" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Вы уверены, что хотите удалить этот заказ?</p>
              <p>Это действие нельзя отменить.</p>
            </div>
            <div className="modal-footer">
              <button className="cancel-button" onClick={() => setShowDeleteModal(false)}>Отмена</button>
              <button className="delete-button" onClick={handleDeleteOrder}>Удалить</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Уведомление */}
      {notification && (
        <div className="notification" onClick={() => setNotification(null)}>
          {notification}
          <button className="notification-close">×</button>
        </div>
      )}
    </div>
  );
};

export default Orders; 