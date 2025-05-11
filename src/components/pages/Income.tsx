import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import '../../styles/pages/Income.css';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Регистрируем компоненты Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, Title);

// Определение интерфейсов для типизации данных
interface ServiceCategory {
  id: string;
  name: string;
  order: number;
}

interface Service {
  id: string;
  title: string;
  price: number;
  currency: string;
  discount?: number;
  description?: string;
  categoryId?: string;
  features?: string[];
}

interface OrderByCategory {
  category: string;
  revenue: number;
  ordersCount: number;
  color: string;
}

interface FirestoreOrder {
  id: string;
  title: string;
  price: number;
  paymentStatus?: string;
  // Добавьте другие необходимые поля из заказов
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

  // Состояния для форм
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [currentCategory, setCurrentCategory] = useState<ServiceCategory | null>(null);
  
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
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Service));
        setServices(servicesData);

        // Загружаем категории услуг
        const categoriesQuery = query(collection(db, 'service_categories'));
        const categoriesSnapshot = await getDocs(categoriesQuery);
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ServiceCategory));
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

        // Вывод в консоль информации о ценах заказов для отладки
        console.log('Цены заказов:', ordersData.map(order => order.price));
        
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

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
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          font: {
            size: 14
          }
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
        }
      }
    },
  };

  // Обработчики для форм услуг
  const handleServiceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'price' || name === 'discount') {
      setServiceForm({
        ...serviceForm,
        [name]: Number(value)
      });
    } else {
      setServiceForm({
        ...serviceForm,
        [name]: value
      });
    }
  };

  const handleFeatureChange = (index: number, value: string) => {
    const updatedFeatures = [...(serviceForm.features || [])];
    updatedFeatures[index] = value;
    setServiceForm({
      ...serviceForm,
      features: updatedFeatures
    });
  };

  const addFeature = () => {
    setServiceForm({
      ...serviceForm,
      features: [...(serviceForm.features || []), '']
    });
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = [...(serviceForm.features || [])];
    updatedFeatures.splice(index, 1);
    setServiceForm({
      ...serviceForm,
      features: updatedFeatures
    });
  };

  // Обработчики для форм категорий
  const handleCategoryFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'order') {
      setCategoryForm({
        ...categoryForm,
        [name]: Number(value)
      });
    } else {
      setCategoryForm({
        ...categoryForm,
        [name]: value
      });
    }
  };

  // Сохранение услуги
  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        title: serviceForm.title,
        price: serviceForm.price,
        currency: serviceForm.currency,
        discount: serviceForm.discount || 0,
        description: serviceForm.description || '',
        categoryId: serviceForm.categoryId || '',
        features: (serviceForm.features || []).filter(f => f.trim() !== '')
      };

      if (currentService) {
        // Обновление существующей услуги
        await setDoc(doc(db, 'services', serviceForm.id), serviceData, { merge: true });
      } else {
        // Создание новой услуги
        const newServiceRef = doc(collection(db, 'services'));
        await setDoc(newServiceRef, serviceData);
      }
      
      // Обновление списка услуг
      await loadData();
      resetServiceForm();
    } catch (error) {
      console.error("Ошибка при сохранении услуги:", error);
    }
  };

  // Сохранение категории
  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryData = {
        name: categoryForm.name,
        order: categoryForm.order
      };

      if (currentCategory) {
        // Обновление существующей категории
        await setDoc(doc(db, 'service_categories', categoryForm.id), categoryData, { merge: true });
      } else {
        // Создание новой категории
        const newCategoryRef = doc(collection(db, 'service_categories'));
        await setDoc(newCategoryRef, categoryData);
      }
      
      // Обновление списка категорий
      await loadData();
      resetCategoryForm();
    } catch (error) {
      console.error("Ошибка при сохранении категории:", error);
    }
  };

  // Удаление услуги
  const deleteService = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту услугу?')) {
      try {
        await deleteDoc(doc(db, 'services', id));
        await loadData();
      } catch (error) {
        console.error("Ошибка при удалении услуги:", error);
      }
    }
  };

  // Удаление категории
  const deleteCategory = async (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту категорию? Это может повлиять на связанные услуги.')) {
      try {
        await deleteDoc(doc(db, 'service_categories', id));
        await loadData();
      } catch (error) {
        console.error("Ошибка при удалении категории:", error);
      }
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

  // Получение имени категории по id
  const getCategoryName = (categoryId: string = '') => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Без категории';
  };

  // Функция загрузки данных услуг и категорий
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Загрузка категорий
      const categoriesSnapshot = await getDocs(collection(db, 'service_categories'));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<ServiceCategory, 'id'>)
      }));
      setCategories(categoriesData.sort((a, b) => a.order - b.order));
      
      // Загрузка услуг
      const servicesSnapshot = await getDocs(collection(db, 'services'));
      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Service, 'id'>)
      }));
      setServices(servicesData);

      // Загрузка заказов и группировка по категориям
      const ordersSnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = ordersSnapshot.docs.map(doc => doc.data());
      
      // Создаем карту соответствия названия услуги и её категории
      const serviceToCategory = new Map();
      servicesData.forEach(service => {
        serviceToCategory.set(service.title, service.categoryId);
      });
      
      // Объект для группировки доходов по категориям
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
        const category = categoriesData.find(cat => cat.id === categoryId);
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
      console.error("Ошибка при загрузке данных:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-page income-page">
      <h1>Доход и статистика</h1>
      
      {/* Общая статистика */}
      <div className="stats-overview">
        <div className="stat-card revenue">
          <div className="stat-icon">
            <span className="material-symbols-outlined">paid</span>
          </div>
          <div className="stat-info">
            <h3>Общий доход</h3>
            <p className="stat-value">{totalRevenue}</p>
          </div>
        </div>
        
        <div className="stat-card orders">
          <div className="stat-icon">
            <span className="material-symbols-outlined">receipt_long</span>
          </div>
          <div className="stat-info">
            <h3>Всего заказов</h3>
            <p className="stat-value">{totalOrders}</p>
          </div>
        </div>
      </div>
      
      {/* График доходов по категориям услуг */}
      <div className="chart-container">
        <h2>Распределение доходов по категориям</h2>
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
          <div className="action-buttons">
            <button className="add-button" onClick={() => setShowServiceForm(true)}>Добавить услугу</button>
            <button className="add-button" onClick={() => setShowCategoryForm(true)}>Добавить категорию</button>
          </div>
        </div>
        
        {isLoading ? (
          <p>Загрузка данных...</p>
        ) : (
          <>
            {/* Вкладки для управления услугами и категориями */}
            <div className="tabs">
              <div className={`tab ${!showCategoryForm ? 'active' : ''}`} onClick={() => {
                resetCategoryForm();
                resetServiceForm();
                setShowCategoryForm(false);
              }}>
                Услуги
              </div>
              <div className={`tab ${showCategoryForm ? 'active' : ''}`} onClick={() => {
                resetCategoryForm();
                resetServiceForm();
                setShowCategoryForm(true);
              }}>
                Категории
              </div>
            </div>
            
            {/* Таблица услуг */}
            {!showCategoryForm && !showServiceForm && (
              <div className="table-container">
                <div className="section-actions">
                  <button className="add-button" onClick={() => {
                    resetServiceForm();
                    setShowServiceForm(true);
                  }}>Добавить услугу</button>
                </div>
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
                    {services.map(service => (
                      <tr key={service.id}>
                        <td>{service.title}</td>
                        <td>{getCategoryName(service.categoryId)}</td>
                        <td>{service.price} {service.currency || '₽'}</td>
                        <td className="actions">
                          <button className="action-button edit" onClick={() => editService(service)}>
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button className="action-button delete" onClick={() => deleteService(service.id)}>
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Таблица категорий */}
            {showCategoryForm && !showServiceForm && !currentCategory && (
              <div className="table-container">
                <div className="section-actions">
                  <button className="add-button" onClick={() => {
                    resetCategoryForm();
                    setCurrentCategory({
                      id: '',
                      name: '',
                      order: 0
                    });
                    setShowServiceForm(false);
                  }}>Добавить категорию</button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Название</th>
                      <th>Порядок</th>
                      <th>Действия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(category => (
                      <tr key={category.id}>
                        <td>{category.name}</td>
                        <td>{category.order}</td>
                        <td className="actions">
                          <button className="action-button edit" onClick={() => editCategory(category)}>
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button className="action-button delete" onClick={() => deleteCategory(category.id)}>
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Форма создания/редактирования услуги */}
            {!showCategoryForm && showServiceForm && (
              <div className="form-container">
                <h3>{currentService ? 'Редактирование услуги' : 'Создание новой услуги'}</h3>
                <form onSubmit={saveService}>
                  <div className="form-group">
                    <label>Название услуги:</label>
                    <input
                      type="text"
                      name="title"
                      value={serviceForm.title}
                      onChange={handleServiceFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Категория:</label>
                    <select
                      name="categoryId"
                      value={serviceForm.categoryId || ''}
                      onChange={handleServiceFormChange}
                    >
                      <option value="">Без категории</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group price-group">
                    <label>Цена:</label>
                    <input
                      type="number"
                      name="price"
                      value={serviceForm.price}
                      onChange={handleServiceFormChange}
                      required
                      min="0"
                    />
                    <input
                      type="text"
                      name="currency"
                      value={serviceForm.currency}
                      onChange={handleServiceFormChange}
                      placeholder="₽"
                      className="currency-input"
                      maxLength={3}
                    />
                  </div>
                  <div className="form-group">
                    <label>Скидка (%):</label>
                    <input
                      type="number"
                      name="discount"
                      value={serviceForm.discount || 0}
                      onChange={handleServiceFormChange}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Описание:</label>
                    <textarea
                      name="description"
                      value={serviceForm.description || ''}
                      onChange={handleServiceFormChange}
                      rows={4}
                    ></textarea>
                  </div>
                  <div className="form-group">
                    <label>Особенности услуги:</label>
                    {serviceForm.features && serviceForm.features.map((feature, index) => (
                      <div key={index} className="feature-input">
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
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                      </div>
                    ))}
                    <button type="button" className="add-feature" onClick={addFeature}>
                      <span className="material-symbols-outlined">add</span> Добавить особенность
                    </button>
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-button" onClick={resetServiceForm}>Отмена</button>
                    <button type="submit" className="save-button">Сохранить</button>
                  </div>
                </form>
              </div>
            )}
            
            {/* Форма создания/редактирования категории */}
            {showCategoryForm && currentCategory && (
              <div className="form-container">
                <h3>{currentCategory ? 'Редактирование категории' : 'Создание новой категории'}</h3>
                <form onSubmit={saveCategory}>
                  <div className="form-group">
                    <label>Название категории:</label>
                    <input
                      type="text"
                      name="name"
                      value={categoryForm.name}
                      onChange={handleCategoryFormChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Порядок отображения:</label>
                    <input
                      type="number"
                      name="order"
                      value={categoryForm.order}
                      onChange={handleCategoryFormChange}
                      min="0"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="cancel-button" onClick={resetCategoryForm}>Отмена</button>
                    <button type="submit" className="save-button">Сохранить</button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Income;