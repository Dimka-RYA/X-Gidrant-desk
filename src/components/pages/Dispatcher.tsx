import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  GeoPoint
} from 'firebase/firestore';
import { db } from '../../assets/firebase';
import '../../styles/pages/Dispatcher.css';
import LocationMap from '../Map';

// Расширенный тип для статусного события
interface StatusEvent {
  dateTime: string;
  notes: string;
  status: string;
}

// Расширенный тип для геолокации
interface EngineerLocation {
  accuracy: number;
  latitude: number;
  longitude: number;
  timestamp: number; // или Timestamp, если приходит из Firestore как Timestamp
}

// Расширенный интерфейс Order
interface Order {
  id: string;
  title: string;
  price: number;
  status: string;
  clientName: string; // Уже есть, оставляем userName для консистентности с Firestore, если надо
  userPhone: string; // новое поле или замена clientPhone
  address: string;
  createdAt: any; // Timestamp из Firestore
  assignedTo?: string;
  assignedToName?: string;
  description?: string;
  clientId?: string; // userId из Firestore
  reviewScore?: number;
  reviewText?: string;
  // Новые поля из вашего скриншота
  additionalInfo?: string;
  arrivalCode?: string;
  completionCode?: string;
  coordinates?: GeoPoint; // Используем GeoPoint 그대로
  currency?: string;
  engineerLocationAtAccept?: EngineerLocation;
  engineerLocationAtDeparture?: EngineerLocation; // Пример, если есть другие
  engineerLocationAtArrival?: EngineerLocation;   // Пример
  engineerLocationAtWork?: EngineerLocation;      // Пример
  lastUpdated?: any; // Timestamp из Firestore
  paidAt?: any; // Timestamp из Firestore
  paymentMethod?: string;
  paymentStatus?: string;
  statusEvents?: StatusEvent[];
  userEmail?: string;
  userName?: string; // Если отличается от clientName
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  currentOrders?: number;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
}

// Добавляем интерфейс для локации на карте
interface MapLocation {
  lat: number;
  lng: number;
  title: string;
  description?: string;
  type: 'engineer' | 'client';
}

// Основная функция страницы диспетчера
const Dispatcher: React.FC = () => {
  // Состояния для заказов, сотрудников, фильтров, модалок и т.д.
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
  
  // Новые состояния
  const [activeTab, setActiveTab] = useState<string>('карта');
  const [mapLocations, setMapLocations] = useState<MapLocation[]>([]);
  const [statsData, setStatsData] = useState({
    totalOrders: 0,
    newOrders: 0,
    inProgressOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    averageOrderCost: 0
  });
  // Добавляем состояние для окна подтверждения удаления
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Функция для получения имени пользователя по ID
  const fetchUserName = async (userId: string) => {
    if (!userId) return '';
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData.name || userData.displayName || '';
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

  // Загрузка заказов из Firestore (обновляем извлечение полей)
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
            // Используем поля из Firestore напрямую или маппим
            clientName: data.userName || data.clientName || 'Неизвестный клиент', // Берем userName если есть
            userPhone: data.userPhone || data.clientPhone || 'Нет номера',
            address: data.address || 'Нет адреса',
            createdAt: data.createdAt,
            assignedTo: data.assignedTo || '',
            assignedToName: data.assignedToName || '',
            description: data.description || '',
            clientId: data.userId || data.clientId || '',
            reviewScore: data.reviewScore || 0,
            reviewText: data.reviewText || '',
            // Новые поля
            additionalInfo: data.additionalInfo || '',
            arrivalCode: data.arrivalCode || '',
            completionCode: data.completionCode || '',
            coordinates: data.coordinates, // GeoPoint 그대로
            currency: data.currency || '',
            engineerLocationAtAccept: data.engineerLocationAtAccept,
            // другие engineerLocation... если есть
            lastUpdated: data.lastUpdated,
            paidAt: data.paidAt,
            paymentMethod: data.paymentMethod || '',
            paymentStatus: data.paymentStatus || '',
            statusEvents: data.statusEvents || [],
            userEmail: data.userEmail || '',
            userName: data.userName || '' // если нужно отдельно от clientName
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
            currentOrders: 0,
            currentLocation: data.currentLocation
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

  // Новый useEffect для подготовки данных для карты и статистики
  useEffect(() => {
    // Подготовка локаций для карты
    const locations: MapLocation[] = [];
    
    // Добавляем клиентов с координатами
    orders.forEach(order => {
      if (order.coordinates) {
        locations.push({
          lat: order.coordinates.latitude,
          lng: order.coordinates.longitude,
          title: `${order.title} - ${order.clientName}`,
          description: `Статус: ${order.status}, Адрес: ${order.address}`,
          type: 'client'
        });
      }
    });
    
    // Добавляем инженеров с последними известными координатами
    employees.forEach(employee => {
      if (employee.currentLocation) {
        locations.push({
          lat: employee.currentLocation.latitude,
          lng: employee.currentLocation.longitude,
          title: `Инженер: ${employee.name}`,
          description: `Телефон: ${employee.phone}, Активных заказов: ${employee.currentOrders || 0}`,
          type: 'engineer'
        });
      } else {
        // Ищем последнюю геолокацию из заказов этого инженера
        const assignedOrders = orders.filter(order => order.assignedTo === employee.id);
        for (const order of assignedOrders) {
          if (order.engineerLocationAtAccept || 
              order.engineerLocationAtArrival || 
              order.engineerLocationAtWork || 
              order.engineerLocationAtDeparture) {
            
            // Берем самую последнюю геолокацию
            const location = order.engineerLocationAtDeparture || 
                            order.engineerLocationAtWork || 
                            order.engineerLocationAtArrival || 
                            order.engineerLocationAtAccept;
            
            if (location) {
              locations.push({
                lat: location.latitude,
                lng: location.longitude,
                title: `Инженер: ${employee.name}`,
                description: `Телефон: ${employee.phone}, Последнее местоположение из заказа`,
                type: 'engineer'
              });
              break;
            }
          }
        }
      }
    });
    
    setMapLocations(locations);
    
    // Подсчет статистики
    if (orders.length) {
      const newOrdersCount = orders.filter(order => order.status === 'новый').length;
      const inProgressOrdersCount = orders.filter(order => 
        ['назначен', 'принят', 'выехал', 'прибыл', 'работает', 'в процессе', 'на проверке'].includes(order.status)
      ).length;
      const completedOrdersCount = orders.filter(order => order.status === 'выполнен').length;
      const canceledOrdersCount = orders.filter(order => order.status === 'отменен').length;
      
      // Подсчет средней стоимости заказа
      const totalPrice = orders.reduce((sum, order) => sum + (order.price || 0), 0);
      const avgPrice = orders.length ? Math.round(totalPrice / orders.length) : 0;
      
      setStatsData({
        totalOrders: orders.length,
        newOrders: newOrdersCount,
        inProgressOrders: inProgressOrdersCount,
        completedOrders: completedOrdersCount,
        canceledOrders: canceledOrdersCount,
        averageOrderCost: avgPrice
      });
    }
  }, [orders, employees]);

  // Обработчик назначения заказа
  const handleAssignOrder = async () => {
    if (!selectedOrder || !selectedEmployee) {
      setNotification('Необходимо выбрать сотрудника');
      return;
    }
    
    try {
      // Получаем данные о сотруднике
      const employeeDoc = await getDoc(doc(db, 'users', selectedEmployee));
      const employeeData = employeeDoc.data();
      
      if (!employeeData) {
        throw new Error('Сотрудник не найден');
      }
      
      // Обновляем заказ
      const orderRef = doc(db, 'orders', selectedOrder.id);
      
      // Получаем текущие статусы заказа
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data();
      const currentEvents = orderData?.statusEvents || [];
      
      // Добавляем новое событие в массив
      const updatedEvents = [
        ...currentEvents,
        {
          status: 'Назначен',
          dateTime: new Date().toLocaleString('ru-RU'),
          notes: `Назначен исполнитель: ${employeeData.name}`,
        }
      ];
      
      // Обновляем документ с новым массивом событий
      await updateDoc(orderRef, {
        assignedTo: selectedEmployee,
        assignedToName: employeeData.name,
        status: 'назначен',
        statusEvents: updatedEvents,
        lastUpdated: serverTimestamp()
      });
      
      // Создаем уведомление для клиента
      if (selectedOrder.clientId) {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedOrder.clientId,
          type: 'order_assigned',
          title: 'Заказ назначен исполнителю',
          message: `Ваш заказ "${selectedOrder.title}" назначен исполнителю ${employeeData.name}`,
          orderId: selectedOrder.id,
          createdAt: serverTimestamp(),
          read: false
        });
      }
      
      // Создаем уведомление для сотрудника
      await addDoc(collection(db, 'notifications'), {
        userId: selectedEmployee,
        type: 'new_order',
        title: 'Новый заказ',
        message: `Вам назначен новый заказ "${selectedOrder.title}"`,
        orderId: selectedOrder.id,
        createdAt: serverTimestamp(),
        read: false
      });
      
      setNotification('Заказ успешно назначен');
      setIsAssigningOrder(false);
      setSelectedOrder(null);
      setSelectedEmployee('');
    } catch (err) {
      console.error('Ошибка при назначении заказа:', err);
      setNotification('Ошибка при назначении заказа');
    }
  };

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
                notes: `Статус изменен диспетчером`
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

  // Обработчик удаления заказа
  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setNotification('Заказ успешно удален');
      
      // Если удаляем открытый заказ, закрываем модальное окно
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(null);
        setIsDetailsModalOpen(false);
      }
      
      // Закрываем модальное окно подтверждения удаления
      setDeleteConfirmationOpen(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Ошибка при удалении заказа:', err);
      setNotification('Ошибка при удалении заказа');
    }
  };
  
  // Функция для открытия диалога подтверждения удаления
  const openDeleteConfirmation = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteConfirmationOpen(true);
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
      return typeof timestamp === 'string' ? timestamp : 'Неверная дата'; // Если уже строка (как в statusEvents), вернуть как есть
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
    <div className="dispatcher-page">
      <div className="page-header">
        <h1>Диспетчерская</h1>
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

      {/* Интерактивная панель с вкладками - обновляем стили */}
      <div className="interactive-dashboard">
        <div className="dashboard-tabs">
          <div 
            className={`dashboard-tab ${activeTab === 'карта' ? 'active' : ''}`}
            onClick={() => setActiveTab('карта')}
          >
            Карта
          </div>
          <div 
            className={`dashboard-tab ${activeTab === 'статистика' ? 'active' : ''}`}
            onClick={() => setActiveTab('статистика')}
          >
            Статистика
          </div>
          <div 
            className={`dashboard-tab ${activeTab === 'таблица' ? 'active' : ''}`}
            onClick={() => setActiveTab('таблица')}
          >
            Таблица заказов
          </div>
        </div>
        
        <div className="dashboard-content">
          {activeTab === 'карта' && (
            <div className="map-section">
              <h3>Карта заказов и местоположения исполнителей</h3>
              {mapLocations.length > 0 ? (
                <LocationMap locations={mapLocations} height="600px" />
              ) : (
                <div className="empty-state">
                  <p>Нет данных о местоположении</p>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'статистика' && (
            <div className="stats-section">
              <h3>Общая статистика заказов</h3>
              <div className="stats-cards">
                <div className="stats-card">
                  <div className="stats-icon total-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 4H18C18.5304 4 19.0391 4.21071 19.4142 4.58579C19.7893 4.96086 20 5.46957 20 6V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M15 2H9C8.44772 2 8 2.44772 8 3V5C8 5.55228 8.44772 6 9 6H15C15.5523 6 16 5.55228 16 5V3C16 2.44772 15.5523 2 15 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 11H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 16H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 11H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M8 16H8.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stats-card-title">Всего заказов</div>
                  <div className="stats-card-value">{statsData.totalOrders}</div>
                  <div className="stats-card-subtitle">за всё время</div>
                </div>
                <div className="stats-card">
                  <div className="stats-icon new-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stats-card-title">Новые заказы</div>
                  <div className="stats-card-value">{statsData.newOrders}</div>
                  <div className="stats-card-subtitle">требуют назначения</div>
                </div>
                <div className="stats-card">
                  <div className="stats-icon progress-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stats-card-title">В работе</div>
                  <div className="stats-card-value">{statsData.inProgressOrders}</div>
                  <div className="stats-card-subtitle">сейчас выполняются</div>
                </div>
                <div className="stats-card">
                  <div className="stats-icon completed-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stats-card-title">Выполненные</div>
                  <div className="stats-card-value">{statsData.completedOrders}</div>
                  <div className="stats-card-subtitle">успешно завершены</div>
                </div>
                <div className="stats-card">
                  <div className="stats-icon canceled-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stats-card-title">Отмененные</div>
                  <div className="stats-card-value">{statsData.canceledOrders}</div>
                  <div className="stats-card-subtitle">отменены клиентами</div>
                </div>
                <div className="stats-card">
                  <div className="stats-icon money-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="stats-card-title">Средняя стоимость</div>
                  <div className="stats-card-value">{statsData.averageOrderCost} ₽</div>
                  <div className="stats-card-subtitle">за один заказ</div>
                </div>
              </div>
              
              <div className="stats-charts-container">
                <div className="stats-chart-box">
                  <h3>Статистика по статусам заказов</h3>
                  <div className="status-chart">
                    <div className="chart-legend">
                      <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: 'rgba(79, 129, 254, 0.7)' }}></div>
                        <div className="legend-label">Новые</div>
                        <div className="legend-value">{statsData.newOrders}</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: 'rgba(255, 153, 0, 0.7)' }}></div>
                        <div className="legend-label">В работе</div>
                        <div className="legend-value">{statsData.inProgressOrders}</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: 'rgba(82, 196, 26, 0.7)' }}></div>
                        <div className="legend-label">Выполненные</div>
                        <div className="legend-value">{statsData.completedOrders}</div>
                      </div>
                      <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: 'rgba(245, 34, 45, 0.7)' }}></div>
                        <div className="legend-label">Отменённые</div>
                        <div className="legend-value">{statsData.canceledOrders}</div>
                      </div>
                    </div>
                    <div className="chart-visual">
                      <div className="status-bar-chart">
                        {statsData.totalOrders > 0 && (
                          <>
                            <div className="status-bar new-bar" style={{ width: `${(statsData.newOrders / statsData.totalOrders) * 100}%` }}></div>
                            <div className="status-bar progress-bar" style={{ width: `${(statsData.inProgressOrders / statsData.totalOrders) * 100}%` }}></div>
                            <div className="status-bar completed-bar" style={{ width: `${(statsData.completedOrders / statsData.totalOrders) * 100}%` }}></div>
                            <div className="status-bar canceled-bar" style={{ width: `${(statsData.canceledOrders / statsData.totalOrders) * 100}%` }}></div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <h3>Активные исполнители</h3>
              {employees.length === 0 ? (
                <p>Нет активных исполнителей</p>
              ) : (
                <div className="employee-stats">
                  <div className="employee-list">
                    {employees.map(employee => (
                      <div key={employee.id} className="employee-card">
                        <div className="employee-avatar">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div className="employee-info">
                          <div className="employee-name">{employee.name}</div>
                          <div className="employee-contact">{employee.phone || employee.email}</div>
                          <div className="employee-workload">
                            <span className="workload-label">Активных заказов:</span> 
                            <span className={`workload-value ${(employee.currentOrders ?? 0) > 2 ? 'high-load' : ''}`}>
                              {employee.currentOrders ?? 0}
                            </span>
                          </div>
                          {employee.currentLocation && (
                            <div className="employee-location">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <circle cx="12" cy="10" r="3" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>На карте</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'таблица' && (
            <>
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Загрузка заказов...</p>
                </div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 2H18C19.1 2 20 2.9 20 4V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V4C4 2.9 4.9 2 6 2Z" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 7H15" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 12H15" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 17H12" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
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
                          <td className="order-price">{order.price} ₽</td>
                          <td>{formatDateOrTimestamp(order.createdAt)}</td>
                          <td>{renderOrderStatus(order.status)}</td>
                          <td className="assigned-employee">
                            {order.assignedToName || (
                              <button 
                                className="assign-button"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setIsAssigningOrder(true);
                                  setIsDetailsModalOpen(true);
                                }}
                              >
                                Назначить
                              </button>
                            )}
                          </td>
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
                              className="action-button delete"
                              onClick={() => openDeleteConfirmation(order.id)}
                              title="Удалить заказ"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H5H21" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Модальное окно с деталями заказа */}
      {isDetailsModalOpen && selectedOrder && (
        <div className="modal-overlay">
          <div className={`modal-content modal-details-view ${isEditingOrder || isAssigningOrder ? 'modal-form-view' : ''}`}>
            <div className="modal-header">
              <h2>{isEditingOrder ? 'Редактирование заказа' : isAssigningOrder ? 'Назначение заказа' : 'Детали заказа'}</h2>
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
                      <option value="qr">Онлайн платеж</option>
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
              ) : isAssigningOrder ? (
                <div className="assign-order-form">
                  <h3>Назначить заказ #{selectedOrder.id}</h3>
                  <div className="order-info">
                    <p><strong>Услуга:</strong> {selectedOrder.title}</p>
                    <p><strong>Клиент:</strong> {selectedOrder.clientName}</p>
                    <p><strong>Адрес:</strong> {selectedOrder.address}</p>
                    <p><strong>Сумма:</strong> {selectedOrder.price} ₽</p>
                  </div>
                  
                  <div className="employee-selection">
                    <h4>Выберите сотрудника:</h4>
                    {employees.length === 0 ? (
                      <p className="no-engineers">Нет доступных сотрудников</p>
                    ) : (
                      <div className="employee-list">
                        {employees.map(employee => (
                          <div 
                            key={employee.id} 
                            className={`employee-card ${selectedEmployee === employee.id ? 'selected' : ''}`}
                            onClick={() => setSelectedEmployee(employee.id)}
                          >
                            <div className="employee-avatar">
                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            <div className="employee-info">
                              <div className="employee-name">{employee.name}</div>
                              <div className="employee-contact">{employee.phone || employee.email}</div>
                              <div className="employee-workload">
                                Активных заказов: <span className={(employee.currentOrders ?? 0) > 2 ? 'high-load' : ''}>{employee.currentOrders ?? 0}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      className="cancel-button" 
                      onClick={() => {
                        setIsAssigningOrder(false);
                        setSelectedEmployee('');
                      }}
                    >
                      Отмена
                    </button>
                    <button 
                      className="assign-confirm-button" 
                      onClick={handleAssignOrder}
                      disabled={!selectedEmployee}
                    >
                      Назначить
                    </button>
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
                      
                      {/* Карта с местоположением инженера */}
                      <div className="order-map">
                        <LocationMap
                          locations={[{
                            lat: selectedOrder.engineerLocationAtAccept.latitude,
                            lng: selectedOrder.engineerLocationAtAccept.longitude,
                            title: `Инженер: ${selectedOrder.assignedToName || 'Исполнитель'}`,
                            description: `Местоположение при принятии заказа`,
                            type: 'engineer'
                          }]}
                          center={[selectedOrder.engineerLocationAtAccept.latitude, selectedOrder.engineerLocationAtAccept.longitude]}
                          zoom={14}
                          height="300px"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {isAssigningOrder && <div className="modal-footer"><button className="save-button" onClick={handleAssignOrder}>Назначить</button></div>}
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления */}
      {deleteConfirmationOpen && orderToDelete && (
        <div className="modal-overlay">
          <div className="modal-content modal-confirm">
            <div className="modal-header">
              <h2>Подтверждение удаления</h2>
              <button 
                className="close-button" 
                onClick={() => {
                  setDeleteConfirmationOpen(false);
                  setOrderToDelete(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="confirm-delete-content">
                <div className="confirm-icon">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 8V12" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="16" r="0.5" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p className="confirm-message">Вы уверены, что хотите удалить этот заказ?</p>
                <p className="confirm-warning">Это действие нельзя будет отменить.</p>
              </div>
              <div className="confirm-actions">
                <button 
                  className="cancel-button" 
                  onClick={() => {
                    setDeleteConfirmationOpen(false);
                    setOrderToDelete(null);
                  }}
                >
                  Отмена
                </button>
                <button 
                  className="delete-confirm-button" 
                  onClick={() => handleDeleteOrder(orderToDelete)}
                >
                  Удалить
                </button>
              </div>
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

export default Dispatcher; 