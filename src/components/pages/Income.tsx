import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import '../../styles/pages/Income.css';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { DollarSign, ShoppingBag, PieChart, PlusCircle, Edit, Trash2, Plus, Minus, ChevronRight, AlertTriangle, X, CheckCircle, AlertCircle } from 'lucide-react';

// Регистрируем компоненты Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, Title);

// Определение интерфейсов для типизации данных
interface ServiceCategory {
  id: string; // id категории
  name: string; // название категории
  order: number; // порядок отображения
}

interface Service {
  id: string; // id услуги
  title: string; // название услуги
  price: number; // цена
  currency: string; // валюта
  discount?: number; // скидка
  description?: string; // описание
  categoryId?: string; // id категории
  features?: string[]; // особенности
}

interface OrderByCategory {
  category: string; // название категории
  revenue: number; // доход по категории
  ordersCount: number; // количество заказов
  color: string; // цвет для диаграммы
}

interface FirestoreOrder {
  id: string;
  title: string;
  price: number;
  paymentStatus?: string;
  // Добавьте другие необходимые поля из заказов
}

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const Income: React.FC = () => {
  // Генерируем цвета для диаграммы
  const generateColors = (count: number) => {
    const colors = [
      'rgba(255, 99, 132, 0.8)', 
      'rgba(54, 162, 235, 0.8)', 
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)', 
      'rgba(153, 102, 255, 0.8)', 
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
      'rgba(255, 99, 255, 0.8)',
      'rgba(99, 255, 132, 0.8)'
    ];
    
    if (count <= colors.length) {
      return colors.slice(0, count);
    }
    
    // Если нужно больше цветов, генерируем случайные
    const result = [...colors];
    for (let i = colors.length; i < count; i++) {
      const r = Math.floor(Math.random() * 255);
      const g = Math.floor(Math.random() * 255);
      const b = Math.floor(Math.random() * 255);
      result.push(`rgba(${r}, ${g}, ${b}, 0.8)`);
    }
    return result;
  };

  // Состояния для данных
  const [ordersByCategory, setOrdersByCategory] = useState<OrderByCategory[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<string>('0 ₽');
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');

  // Состояния для форм
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [currentCategory, setCurrentCategory] = useState<ServiceCategory | null>(null);
  
  // Состояния для модальных окон
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'service' | 'category', name: string} | null>(null);
  
  // Состояние для уведомлений
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Данные форм
  const [serviceForm, setServiceForm] = useState<Service>({
    id: '',
    title: '',
    price: 0,
    currency: '₽',
    discount: 0,
    description: '',
    categoryId: '',
    features: ['']
  });
  
  const [categoryForm, setCategoryForm] = useState<ServiceCategory>({
    id: '',
    name: '',
    order: 0
  });

  // Загрузка данных из Firestore
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Загружаем услуги
        const servicesQuery = query(collection(db, 'services'));
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => {
          console.log(`Service document:`, doc.id, doc.data());
          return {
            id: doc.id,
            ...doc.data()
          } as Service;
        });
        console.log('Loaded services:', servicesData);
        setServices(servicesData);

        // Загружаем категории услуг
        const categoriesQuery = query(collection(db, 'service_categories'), orderBy('order'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => {
          // Убедимся, что ID документа корректно присваивается
          console.log(`Загружаем категорию: ID=${doc.id}, данные=`, doc.data());
          const categoryData = doc.data();
          return {
            ...categoryData,
            id: doc.id  // Явно присваиваем ID документа
          } as ServiceCategory;
        });
        console.log('Загруженные категории:', categoriesData);
        setCategories(categoriesData);

        // Загружаем заказы
        const ordersQuery = query(collection(db, 'orders'));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FirestoreOrder));

        // Создаем маппинг названий услуг к их категориям
        const serviceTitleToCategoryId: Record<string, string | undefined> = {};
        servicesData.forEach(service => {
          serviceTitleToCategoryId[service.title] = service.categoryId;
        });

        // Создаем маппинг ID категорий к их названиям
        const categoryIdToName: Record<string, string> = {};
        categoriesData.forEach(category => {
          categoryIdToName[category.id] = category.name;
        });
        
        // Подсчитываем доходы и количество заказов по категориям
        const revenueByCategory: Record<string, { revenue: number, count: number }> = {};
        
        // Обрабатываем данные заказов
        ordersData.forEach(order => {
          if (order.price) {
            const price = Number(order.price);
            if (!isNaN(price)) {
              const categoryId = serviceTitleToCategoryId[order.title];
              
              if (categoryId) {
                const categoryName = categoryIdToName[categoryId] || 'Прочее';
                
                if (!revenueByCategory[categoryName]) {
                  revenueByCategory[categoryName] = { revenue: 0, count: 0 };
                }
                
                revenueByCategory[categoryName].revenue += price;
                revenueByCategory[categoryName].count++;
              }
            }
          }
        });

        // Если данных нет, создаем пустую запись
        if (Object.keys(revenueByCategory).length === 0) {
          revenueByCategory['Нет данных'] = { revenue: 0, count: 0 };
        }

        // Преобразуем данные для диаграммы
        const categoryNames = Object.keys(revenueByCategory);
        const categoryColors = generateColors(categoryNames.length);
        
        const ordersByCategoryData = categoryNames.map((categoryName, index) => ({
          category: categoryName,
          revenue: revenueByCategory[categoryName].revenue,
          ordersCount: revenueByCategory[categoryName].count,
          color: categoryColors[index]
        }));

        // Сортируем категории по убыванию дохода
        ordersByCategoryData.sort((a, b) => b.revenue - a.revenue);

        // Рассчитываем общий доход как сумму доходов из диаграммы
        const totalRevenue = ordersByCategoryData.reduce((sum, item) => sum + item.revenue, 0);
        // Количество заказов берем из базы данных
        const totalOrdersCount = ordersData.length;

        setOrdersByCategory(ordersByCategoryData);
        setTotalRevenue(`${totalRevenue} ₽`);
        setTotalOrders(totalOrdersCount);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        showNotification('error', 'Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Функция для показа уведомлений
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    
    // Автоматическое удаление уведомления через 5 секунд
    setTimeout(() => {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    }, 5000);
  };
  
  // Удаление уведомления
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Подготовка данных для круговой диаграммы
  const chartData = {
    labels: ordersByCategory.map(item => `${item.category} (${item.revenue} ₽)`),
    datasets: [
      {
        data: ordersByCategory.map(item => item.revenue),
        backgroundColor: ordersByCategory.map(item => item.color),
        borderColor: ordersByCategory.map(item => item.color.replace('0.8', '1')),
        borderWidth: 1,
      },
    ],
  };

  // Опции для круговой диаграммы
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 14,
            family: 'Montserrat, sans-serif',
            weight: 'bold' as const
          },
          color: '#000',
          padding: 16,
          usePointStyle: true,
          boxWidth: 10
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.chart.getDatasetMeta(0).total;
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${percentage}%`;
          }
        },
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#000',
        bodyColor: '#000',
        titleFont: {
          size: 14, 
          weight: 'bold' as const,
          family: 'Montserrat, sans-serif'
        },
        bodyFont: {
          size: 13,
          family: 'Montserrat, sans-serif'
        },
        padding: 14,
        borderColor: '#ddd',
        borderWidth: 1,
        boxWidth: 0,
        boxHeight: 0,
        boxPadding: 0,
        usePointStyle: true
      }
    },
    cutout: '50%',
    animation: {
      animateScale: true,
      animateRotate: true,
      duration: 1000
    }
  };

  // Обработчики форм

  const handleServiceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setServiceForm(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'discount' ? Number(value) : value
    }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    setServiceForm(prev => {
      const updatedFeatures = [...(prev.features || [])];
    updatedFeatures[index] = value;
      return {
        ...prev,
      features: updatedFeatures
      };
    });
  };

  const addFeature = () => {
    setServiceForm(prev => ({
      ...prev,
      features: [...(prev.features || []), '']
    }));
  };

  const removeFeature = (index: number) => {
    setServiceForm(prev => {
      const updatedFeatures = [...(prev.features || [])];
    updatedFeatures.splice(index, 1);
      return {
        ...prev,
      features: updatedFeatures
      };
    });
  };

  const handleCategoryFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCategoryForm(prev => ({
      ...prev,
      [name]: name === 'order' ? Number(value) : value
    }));
  };

  // Сохранение услуги
  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Подготавливаем данные услуги (без ID)
      const { id, ...serviceDataWithoutId } = serviceForm;
      
      // Фильтруем пустые особенности
      const serviceData = {
        ...serviceDataWithoutId,
        features: serviceForm.features?.filter(f => f.trim() !== '')
      };
      
      console.log('Сохранение услуги:', { id, serviceData });

      if (currentService) {
        // Обновление существующей услуги
        console.log(`Обновляем услугу с ID: ${currentService.id}`);
        await setDoc(doc(db, 'services', currentService.id), serviceData);
        showNotification('success', `Услуга "${serviceData.title}" обновлена`);
      } else {
        // Создание новой услуги
        const newServiceRef = doc(collection(db, 'services'));
        console.log(`Создаем новую услугу с ID: ${newServiceRef.id}`);
        await setDoc(newServiceRef, serviceData);
        showNotification('success', `Услуга "${serviceData.title}" добавлена`);
      }
      
      // Обновление данных и закрытие формы
      resetServiceForm();
      loadData();
    } catch (error) {
      console.error('Ошибка при сохранении услуги:', error);
      showNotification('error', 'Ошибка при сохранении услуги');
    }
  };

  // Сохранение категории
  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Подготавливаем данные категории (без ID)
      const { id, ...categoryDataWithoutId } = categoryForm;
      
      console.log('Сохранение категории:', { id, categoryData: categoryDataWithoutId });

      if (currentCategory) {
        // Обновление существующей категории
        console.log(`Обновляем категорию с ID: ${currentCategory.id}`);
        await setDoc(doc(db, 'service_categories', currentCategory.id), categoryDataWithoutId);
        showNotification('success', `Категория "${categoryForm.name}" обновлена`);
      } else {
        // Создание новой категории
        const newCategoryRef = doc(collection(db, 'service_categories'));
        console.log(`Создаем новую категорию с ID: ${newCategoryRef.id}`);
        await setDoc(newCategoryRef, categoryDataWithoutId);
        showNotification('success', `Категория "${categoryForm.name}" добавлена`);
      }
      
      // Обновление данных и закрытие формы
      resetCategoryForm();
      loadData();
    } catch (error) {
      console.error('Ошибка при сохранении категории:', error);
      showNotification('error', 'Ошибка при сохранении категории');
    }
  };

  // Открытие модального окна удаления
  const openDeleteConfirmation = (id: string, type: 'service' | 'category') => {
    console.log(`openDeleteConfirmation: тип=${type}, id=${id}, typeof id=${typeof id}`);
    
    // Проверка на пустой ID
    if (!id) {
      console.error(`ID пустой или undefined: ${id}`);
      showNotification('error', `Невозможно удалить ${type === 'service' ? 'услугу' : 'категорию'}: ID не указан`);
      return;
    }
    
    // Найти элемент для удаления
    let itemToDelete: { id: string; type: 'service' | 'category'; name: string } | null = null;
    
    if (type === 'service') {
      // Выводим все услуги для отладки
      console.log("Все услуги:", services);
      
      // Ищем услугу по ID
      const serviceToDelete = services.find(s => s.id === id);
      console.log("Найденная услуга:", serviceToDelete);
      
      if (serviceToDelete) {
        itemToDelete = {
          id: id,
          type: 'service',
          name: serviceToDelete.title || 'Без названия'
        };
      }
    } else {
      // Выводим все категории для отладки
      console.log("Все категории:", categories);
      
      // Ищем категорию по ID
      const categoryToDelete = categories.find(c => c.id === id);
      console.log("Найденная категория:", categoryToDelete);
      
      if (categoryToDelete) {
        itemToDelete = {
          id: id,
          type: 'category',
          name: categoryToDelete.name || 'Без названия'
        };
      }
    }
    
    // Проверяем, найден ли элемент
    if (itemToDelete) {
      console.log("Элемент для удаления:", itemToDelete);
      setItemToDelete(itemToDelete);
      setShowDeleteConfirmation(true);
    } else {
      console.error(`Элемент с id=${id} и типом=${type} не найден`);
      showNotification('error', `${type === 'service' ? 'Услуга' : 'Категория'} не найдена`);
    }
  };
  
  // Закрытие модального окна удаления
  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setItemToDelete(null);
  };

  // Выполнение удаления
  const confirmDelete = async () => {
    if (!itemToDelete) {
      console.error('itemToDelete отсутствует');
      return;
    }
    
    try {
      const { id, type } = itemToDelete;
      console.log(`Удаление: тип=${type}, id=${id}`);
      
      // Проверка ID
      if (!id) {
        throw new Error('ID документа не может быть пустым');
      }
      
      // Определение коллекции
      const collectionName = type === 'service' ? 'services' : 'service_categories';
      console.log(`Коллекция: ${collectionName}, ID: ${id}`);
      
      // Удаление документа
      await deleteDoc(doc(db, collectionName, id));
      console.log('Документ успешно удален');
      
      // Уведомление об успешном удалении
      showNotification(
        'success', 
        `${type === 'service' ? 'Услуга' : 'Категория'} "${itemToDelete.name}" удалена`
      );
      
      // Закрытие модального окна
      setShowDeleteConfirmation(false);
      setItemToDelete(null);
      
      // Обновление данных
      loadData();
    } catch (error) {
      console.error('Ошибка при удалении:', error);
      showNotification('error', `Ошибка при удалении: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  };

  // Редактирование услуги
  const editService = (service: Service) => {
    setCurrentService(service);
    setServiceForm({
      id: service.id,
      title: service.title,
      price: service.price,
      currency: service.currency || '₽',
      discount: service.discount || 0,
      description: service.description || '',
      categoryId: service.categoryId || '',
      features: service.features || ['']
    });
    setShowServiceForm(true);
  };

  // Редактирование категории
  const editCategory = (category: ServiceCategory) => {
    setCurrentCategory(category);
    setCategoryForm({
      id: category.id,
      name: category.name,
      order: category.order
    });
    setShowCategoryForm(true);
  };

  // Сброс формы услуги
  const resetServiceForm = () => {
    setCurrentService(null);
    setServiceForm({
      id: '',
      title: '',
      price: 0,
      currency: '₽',
      discount: 0,
      description: '',
      categoryId: '',
      features: ['']
    });
    setShowServiceForm(false);
  };

  // Сброс формы категории
  const resetCategoryForm = () => {
    setCurrentCategory(null);
    setCategoryForm({
      id: '',
      name: '',
      order: 0
    });
    setShowCategoryForm(false);
  };

  // Получение названия категории по ID
  const getCategoryName = (categoryId: string = '') => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Не указана';
  };

  // Перезагрузка данных
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Загружаем услуги
      try {
        const servicesQuery = query(collection(db, 'services'));
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => {
          // Убедимся, что ID документа корректно присваивается
          console.log(`Загружаем услугу: ID=${doc.id}, данные=`, doc.data());
          const serviceData = doc.data();
          return {
            ...serviceData,
            id: doc.id  // Явно присваиваем ID документа
          } as Service;
        });
        console.log('Загруженные услуги:', servicesData);
        setServices(servicesData);
      } catch (error) {
        console.error("Ошибка при загрузке услуг:", error);
        showNotification('error', 'Ошибка при загрузке услуг');
      }

      // Загружаем категории услуг
      try {
        const categoriesQuery = query(collection(db, 'service_categories'), orderBy('order'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => {
          // Убедимся, что ID документа корректно присваивается
          console.log(`Загружаем категорию: ID=${doc.id}, данные=`, doc.data());
          const categoryData = doc.data();
          return {
            ...categoryData,
            id: doc.id  // Явно присваиваем ID документа
          } as ServiceCategory;
        });
        console.log('Загруженные категории:', categoriesData);
        setCategories(categoriesData);
      } catch (error) {
        console.error("Ошибка при загрузке категорий:", error);
        showNotification('error', 'Ошибка при загрузке категорий');
      }

      // Загружаем заказы
      let ordersData: FirestoreOrder[] = [];
      try {
        const ordersQuery = query(collection(db, 'orders'));
        const ordersSnapshot = await getDocs(ordersQuery);
        ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FirestoreOrder));
      } catch (error) {
        console.error("Ошибка при загрузке заказов:", error);
        showNotification('error', 'Ошибка при загрузке заказов');
      }
      
      // Обработка данных для диаграммы
      try {
        // Создаем маппинг услуг к их категориям
        const serviceToCategory = new Map<string, string>();
        services.forEach(service => {
          if (service.categoryId) {
            serviceToCategory.set(service.title, service.categoryId);
          }
        });
        
        // Рассчитываем доходы по категориям
        const categoryRevenue: Record<string, number> = {};
        const categoryCount: Record<string, number> = {};
        
        // Обработка заказов
        ordersData.forEach(order => {
          if (!order.title || !order.price) return;
          
          // Получаем categoryId по названию услуги
          const categoryId = serviceToCategory.get(order.title);
          
          // Учитываем только заказы с указанной категорией
          if (categoryId) {
            // Суммируем доходы по категории
            categoryRevenue[categoryId] = (categoryRevenue[categoryId] || 0) + (order.price || 0);
            categoryCount[categoryId] = (categoryCount[categoryId] || 0) + 1;
          }
        });
        
        // Создаем массив данных для диаграммы
        const categoriesWithRevenue: OrderByCategory[] = Object.entries(categoryRevenue).map(([categoryId, revenue], index) => {
          // Находим название категории
          const category = categories.find(cat => cat.id === categoryId);
          const categoryName = category ? category.name : 'Прочее';
          
          // Определяем цвет для категории
          const colors = generateColors(Object.keys(categoryRevenue).length);
          const color = colors[index];
          
          return {
            category: categoryName,
            revenue: revenue,
            ordersCount: categoryCount[categoryId],
            color: color
          };
        });
        
        // Сортируем категории по убыванию дохода
        categoriesWithRevenue.sort((a, b) => b.revenue - a.revenue);
        
        // Обновляем данные для диаграммы
        setOrdersByCategory(categoriesWithRevenue);
        
        // Рассчитываем общий доход как сумму из диаграммы
        const totalRev = categoriesWithRevenue.reduce((sum, item) => sum + item.revenue, 0);
        // Количество заказов берем из базы данных
        const totalOrd = ordersData.length;
        
        // Обновляем общие показатели
        setTotalRevenue(`${totalRev} ₽`);
        setTotalOrders(totalOrd);
      } catch (error) {
        console.error("Ошибка при обработке данных для диаграммы:", error);
        showNotification('error', 'Ошибка при обработке данных');
      }
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      showNotification('error', 'Ошибка при загрузке данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Получение иконки для уведомления
  const getNotificationIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle size={18} />;
      case 'error':
        return <AlertCircle size={18} />;
      case 'info':
        return <AlertTriangle size={18} />;
      default:
        return null;
    }
  };

  return (
    <div className="admin-page income-page">
      <h1>Доход и статистика</h1>
      
      {/* Общая статистика */}
      <div className="stats-overview">
        <div className="stat-card revenue">
          <div className="stat-icon">
            <DollarSign size={24} />
          </div>
          <div className="stat-info">
            <h3>Общий доход</h3>
            <p className="stat-value">{totalRevenue}</p>
          </div>
        </div>
        
        <div className="stat-card orders">
          <div className="stat-icon">
            <ShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <h3>Всего заказов</h3>
            <p className="stat-value">{totalOrders}</p>
          </div>
        </div>
      </div>
      
      {/* График доходов по категориям услуг */}
      <div className="chart-container">
        <h2>
          <PieChart size={20} className="chart-icon" />
          <span>Распределение доходов по категориям</span>
        </h2>
        <div className="pie-chart-wrapper">
          {isLoading ? (
            <div className="loading">Загрузка данных...</div>
          ) : (
            <Pie data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Услуги и категории */}
      <div className="services-management">
        <div className="section-header">
          <h2>Услуги и категории</h2>
          <div className="section-actions">
            <button 
              className="add-button" 
              onClick={() => setShowCategoryForm(true)}
              style={{ backgroundColor: "#D04E4E" }}
            >
              <PlusCircle size={16} />
              <span>Добавить категорию</span>
            </button>
            <button 
              className="add-button" 
              onClick={() => setShowServiceForm(true)}
              style={{ backgroundColor: "#D04E4E" }}
            >
              <PlusCircle size={16} />
              <span>Добавить услугу</span>
            </button>
          </div>
        </div>
        
            <div className="tabs">
          <div 
            className={`tab ${activeTab === 'services' ? 'active' : ''}`}
            onClick={() => setActiveTab('services')}
          >
                Услуги
              </div>
          <div 
            className={`tab ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
                Категории
              </div>
            </div>
            
        {showServiceForm && (
              <div className="form-container">
            <h3>{currentService ? 'Редактирование услуги' : 'Новая услуга'}</h3>
                <form onSubmit={saveService}>
                  <div className="form-group">
                <label>Название услуги</label>
                <input type="text" name="title" value={serviceForm.title} onChange={handleServiceFormChange} required />
                  </div>
              
                  <div className="form-group price-group">
                <label>Цена</label>
                <div className="price-inputs">
                    <input
                      type="number"
                      name="price"
                      value={serviceForm.price}
                      onChange={handleServiceFormChange}
                      min="0"
                    required 
                    />
                    <input
                      type="text"
                      name="currency"
                      value={serviceForm.currency}
                      onChange={handleServiceFormChange}
                      className="currency-input"
                    required 
                    />
                  </div>
              </div>
              
                  <div className="form-group">
                <label>Скидка (%)</label>
                    <input
                      type="number"
                      name="discount"
                  value={serviceForm.discount} 
                      onChange={handleServiceFormChange}
                      min="0"
                      max="100"
                    />
                  </div>
              
                  <div className="form-group">
                <label>Описание</label>
                    <textarea
                      name="description"
                  value={serviceForm.description} 
                      onChange={handleServiceFormChange}
                  rows={3}
                    ></textarea>
                  </div>
              
                  <div className="form-group">
                <label>Категория</label>
                <select 
                  name="categoryId" 
                  value={serviceForm.categoryId} 
                  onChange={handleServiceFormChange}
                >
                  <option value="">Выберите категорию</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Особенности</label>
                    {serviceForm.features && serviceForm.features.map((feature, index) => (
                  <div className="feature-input" key={index}>
                        <input
                          type="text"
                          value={feature}
                          onChange={(e) => handleFeatureChange(index, e.target.value)}
                          placeholder="Особенность услуги"
                        />
                        <button 
                          type="button" 
                          className="remove-feature" 
                          onClick={() => removeFeature(index)}
                          disabled={serviceForm.features?.length === 1}
                        >
                      <Minus size={16} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="add-feature" onClick={addFeature}>
                  <Plus size={16} />
                  <span>Добавить особенность</span>
                    </button>
                  </div>
              
                  <div className="form-actions">
                    <button type="button" className="cancel-button" onClick={resetServiceForm}>Отмена</button>
                <button type="submit" className="save-button" style={{ backgroundColor: "#D04E4E" }}>Сохранить</button>
                  </div>
                </form>
              </div>
            )}
            
        {showCategoryForm && (
              <div className="form-container">
            <h3>{currentCategory ? 'Редактирование категории' : 'Новая категория'}</h3>
                <form onSubmit={saveCategory}>
                  <div className="form-group">
                <label>Название категории</label>
                <input type="text" name="name" value={categoryForm.name} onChange={handleCategoryFormChange} required />
                  </div>
              
                  <div className="form-group">
                <label>Порядок отображения</label>
                <input type="number" name="order" value={categoryForm.order} onChange={handleCategoryFormChange} min="0" />
                  </div>
              
                  <div className="form-actions">
                    <button type="button" className="cancel-button" onClick={resetCategoryForm}>Отмена</button>
                <button type="submit" className="save-button" style={{ backgroundColor: "#D04E4E" }}>Сохранить</button>
                  </div>
                </form>
              </div>
            )}
        
        <div className="table-container">
          {activeTab === 'services' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Категория</th>
                  <th>Цена</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => {
                  console.log(`Rendering service: id="${service.id}", title="${service.title}"`);
                  return (
                    <tr key={service.id}>
                      <td>{service.title}</td>
                      <td>{getCategoryName(service.categoryId)}</td>
                      <td>{service.price} {service.currency}</td>
                      <td className="actions">
                        <button className="action-button edit" onClick={() => editService(service)} title="Редактировать">
                          <Edit size={16} color="#4a90e2" />
                        </button>
                        <button 
                          className="action-button delete" 
                          onClick={() => {
                            console.log(`Delete button clicked for service:`, service);
                            if (!service) {
                              console.error('Service is undefined');
                              showNotification('error', 'Невозможно удалить услугу: услуга не найдена');
                              return;
                            }
                            
                            // Ensure we have a valid ID
                            const serviceId = service.id;
                            console.log(`Service ID: "${serviceId}", Type: ${typeof serviceId}`);
                            
                            if (!serviceId || typeof serviceId !== 'string' || serviceId.trim() === '') {
                              console.error('Invalid service ID:', serviceId);
                              showNotification('error', 'Невозможно удалить услугу: ID не указан');
                              return;
                            }
                            
                            // Use the string ID directly
                            openDeleteConfirmation(String(serviceId), 'service');
                          }} 
                          title="Удалить"
                        >
                          <Trash2 size={16} color="#D04E4E" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={4} className="no-data">Нет данных</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
          
          {activeTab === 'categories' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Порядок</th>
                  <th>Кол-во услуг</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => {
                  console.log(`Rendering category: id="${category.id}", name="${category.name}"`);
                  return (
                    <tr key={category.id}>
                      <td>{category.name}</td>
                      <td>{category.order}</td>
                      <td>{services.filter(service => service.categoryId === category.id).length}</td>
                      <td className="actions">
                        <button className="action-button edit" onClick={() => editCategory(category)} title="Редактировать">
                          <Edit size={16} color="#4a90e2" />
                        </button>
                        <button 
                          className="action-button delete" 
                          onClick={() => {
                            console.log(`Delete button clicked for category:`, category);
                            if (!category) {
                              console.error('Category is undefined');
                              showNotification('error', 'Невозможно удалить категорию: категория не найдена');
                              return;
                            }
                            
                            // Ensure we have a valid ID
                            const categoryId = category.id;
                            console.log(`Category ID: "${categoryId}", Type: ${typeof categoryId}`);
                            
                            if (!categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
                              console.error('Invalid category ID:', categoryId);
                              showNotification('error', 'Невозможно удалить категорию: ID не указан');
                              return;
                            }
                            
                            // Use the string ID directly
                            openDeleteConfirmation(String(categoryId), 'category');
                          }} 
                          title="Удалить"
                        >
                          <Trash2 size={16} color="#D04E4E" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {categories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="no-data">Нет данных</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirmation && itemToDelete && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Подтверждение удаления</h2>
              <button className="close-button" onClick={closeDeleteConfirmation}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirmation-content">
                <div className="confirmation-icon">
                  <AlertTriangle size={40} color="#D04E4E" />
                </div>
                <div className="confirmation-message">
                  <p>Вы действительно хотите удалить {itemToDelete.type === 'service' ? 'услугу' : 'категорию'} 
                  <strong> "{itemToDelete.name}"</strong>?</p>
                  
                  {itemToDelete.type === 'category' && (
                    <p className="warning-text">Внимание! Это может повлиять на связанные услуги.</p>
                  )}
                  
                  <p>Это действие невозможно отменить.</p>
                </div>
              </div>
              
              <div className="confirmation-actions">
                <button 
                  className="cancel-button" 
                  onClick={closeDeleteConfirmation}
                >
                  Отмена
                </button>
                <button 
                  className="delete-button" 
                  onClick={confirmDelete}
                  style={{ backgroundColor: "#D04E4E" }}
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Уведомления */}
      <div className="notifications-container">
        {notifications.map(notification => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <div className="notification-icon">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="notification-message">{notification.message}</div>
            <button 
              className="notification-close" 
              onClick={() => removeNotification(notification.id)}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Income;