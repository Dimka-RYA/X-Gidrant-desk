import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import { Line, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import '../../styles/pages/Home.css';

// Регистрируем необходимые компоненты Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Интерфейсы для типизации данных 
interface OrderData {
  count: number;
  date: string;
}

interface IncomeData {
  amount: number;
  date: string;
}

interface EmployeeActivity {
  name: string;
  completedOrders: number;
}

const Home: React.FC = () => {
  // Состояния для данных графиков
  const [orderData, setOrderData] = useState<OrderData[]>([]);
  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [employeeActivity, setEmployeeActivity] = useState<EmployeeActivity[]>([]);
  
  // Состояния для фильтров
  const [orderPeriod, setOrderPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [incomePeriod, setIncomePeriod] = useState<'day' | 'week' | 'month'>('month');
  const [activityPeriod, setActivityPeriod] = useState<'day' | 'week' | 'month'>('month');
  
  const [loadingCards, setLoadingCards] = useState(true);
  const [loadingOrdersChart, setLoadingOrdersChart] = useState(true);
  const [loadingIncomeChart, setLoadingIncomeChart] = useState(true);
  const [loadingActivityChart, setLoadingActivityChart] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [employeesCount, setEmployeesCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalEmployeeActivity, setTotalEmployeeActivity] = useState(0);

  // Функция получения временных рамок для фильтрации
  const getDateRange = (period: 'day' | 'week' | 'month') => {
    const now = new Date();
    let startDate: Date;
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999); // Конец текущего дня

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Начало текущего дня
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))); // Начало текущей недели (понедельник)
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Начало текущего месяца
        break;
      default:
        startDate = new Date(now.getFullYear(), 0, 1); // По умолчанию - начало года
    }
    return { startDate, endDate };
  };

  // Функция загрузки данных о заказах с фильтрацией по периоду
  const loadOrderData = async () => {
    console.log('[OrdersChart] Начало загрузки данных для графика заказов...');
    setLoadingOrdersChart(true);
    try {
      const { startDate, endDate } = getDateRange(orderPeriod);
      console.log(`[OrdersChart] Период: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, 
                      where('createdAt', '>=', Timestamp.fromDate(startDate)), 
                      where('createdAt', '<=', Timestamp.fromDate(endDate)),
                      orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      console.log(`[OrdersChart] Получено заказов: ${snapshot.size}`);

      const data: OrderData[] = [];
      if (orderPeriod === 'day') {
        const byHour: { [key: string]: number } = {};
        snapshot.forEach(doc => {
          const order = doc.data();
          if (order.createdAt) {
            const date = (order.createdAt as Timestamp).toDate();
            const hour = `${date.getHours().toString().padStart(2, '0')}:00`;
            byHour[hour] = (byHour[hour] || 0) + 1;
          }
        });
        for (let i = 0; i < 24; i++) { // Формируем данные для каждого часа
          const hourStr = `${i.toString().padStart(2, '0')}:00`;
          data.push({ date: hourStr, count: byHour[hourStr] || 0 });
        }
      } else if (orderPeriod === 'week') {
        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        const byDay: { [key: string]: number } = {};
        snapshot.forEach(doc => {
          const order = doc.data();
          if (order.createdAt) {
            const date = (order.createdAt as Timestamp).toDate();
            const dayIndex = (date.getDay() + 6) % 7; // Пн = 0, Вс = 6
            byDay[daysOfWeek[dayIndex]] = (byDay[daysOfWeek[dayIndex]] || 0) + 1;
          }
        });
        daysOfWeek.forEach(day => data.push({ date: day, count: byDay[day] || 0 }));
      } else { // month
        const byMonthDay: { [key: string]: number } = {};
        snapshot.forEach(doc => {
          const order = doc.data();
          if (order.createdAt) {
            const date = (order.createdAt as Timestamp).toDate();
            const day = date.getDate().toString();
            byMonthDay[day] = (byMonthDay[day] || 0) + 1;
          }
        });
        const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          data.push({ date: i.toString(), count: byMonthDay[i.toString()] || 0 });
        }
      }
      console.log('[OrdersChart] Финальные данные для графика заказов:', data);
      setOrderData(data);
    } catch (error) {
      console.error("[OrdersChart] Ошибка при загрузке данных о заказах:", error);
      setError("Ошибка загрузки графика заказов");
    } finally {
      setLoadingOrdersChart(false);
      console.log('[OrdersChart] Загрузка данных для графика заказов завершена.');
    }
  };

  // Функция загрузки данных о доходах с фильтрацией по периоду (на основе createdAt)
  const loadIncomeData = async () => {
    console.log('[IncomeChart] Начало загрузки данных для графика доходов...');
    setLoadingIncomeChart(true);
    try {
      const { startDate, endDate } = getDateRange(incomePeriod);
      console.log(`[IncomeChart] Период: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      const ordersRef = collection(db, 'orders');
      const q = query(ordersRef, 
                      where('createdAt', '>=', Timestamp.fromDate(startDate)), 
                      where('createdAt', '<=', Timestamp.fromDate(endDate)),
                      where('paymentStatus', '==', 'оплачен'), // Только оплаченные
                      orderBy('createdAt', 'asc'));
      const snapshot = await getDocs(q);
      console.log(`[IncomeChart] Получено оплаченных заказов: ${snapshot.size}`);
      if (snapshot.size > 0 && snapshot.size < 5) { // Логируем несколько документов для примера
        snapshot.docs.forEach(doc => console.log('[IncomeChart] Документ заказа для дохода:', doc.id, doc.data()));
      }
      
      const data: IncomeData[] = [];
      if (incomePeriod === 'day') {
        const byHour: { [key: string]: number } = {};
        snapshot.forEach(doc => {
          const order = doc.data();
          if (order.createdAt && order.price) {
            const date = (order.createdAt as Timestamp).toDate();
            const hour = `${date.getHours().toString().padStart(2, '0')}:00`;
            byHour[hour] = (byHour[hour] || 0) + Number(order.price);
          }
        });
        console.log('[IncomeChart] Доход по часам (сырые данные):', byHour);
        for (let i = 0; i < 24; i++) {
          const hourStr = `${i.toString().padStart(2, '0')}:00`;
          data.push({ date: hourStr, amount: byHour[hourStr] || 0 });
        }
      } else if (incomePeriod === 'week') {
        const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        const byDay: { [key: string]: number } = {};
        snapshot.forEach(doc => {
          const order = doc.data();
          if (order.createdAt && order.price) {
            const date = (order.createdAt as Timestamp).toDate();
            const dayIndex = (date.getDay() + 6) % 7;
            byDay[daysOfWeek[dayIndex]] = (byDay[daysOfWeek[dayIndex]] || 0) + Number(order.price);
          }
        });
        console.log('[IncomeChart] Доход по дням недели (сырые данные):', byDay);
        daysOfWeek.forEach(day => data.push({ date: day, amount: byDay[day] || 0 }));
      } else { // month
        const byMonthDay: { [key: string]: number } = {};
        snapshot.forEach(doc => {
          const order = doc.data();
          if (order.createdAt && order.price) {
            const date = (order.createdAt as Timestamp).toDate();
            const day = date.getDate().toString();
            byMonthDay[day] = (byMonthDay[day] || 0) + Number(order.price);
          }
        });
        console.log('[IncomeChart] Доход по дням месяца (сырые данные):', byMonthDay);
        const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
          data.push({ date: i.toString(), amount: byMonthDay[i.toString()] || 0 });
        }
      }
      console.log('[IncomeChart] Финальные данные для графика дохода:', data);
      setIncomeData(data);
    } catch (error) {
      console.error("[IncomeChart] Ошибка при загрузке данных о доходах:", error);
      setError("Ошибка загрузки графика доходов");
    } finally {
      setLoadingIncomeChart(false);
      console.log('[IncomeChart] Загрузка данных для графика доходов завершена.');
    }
  };

  // Функция загрузки данных об активности сотрудников (только инженеры) с фильтрацией по периоду
  const loadEmployeeActivityData = async () => {
    console.log('[ActivityChart] Начало загрузки данных для графика активности...');
    setLoadingActivityChart(true);
    try {
      const { startDate, endDate } = getDateRange(activityPeriod);
      console.log(`[ActivityChart] Период: ${startDate.toISOString()} - ${endDate.toISOString()}`);
      const usersRef = collection(db, 'users');
      const usersQ = query(usersRef, where("role", "==", "engineer")); // Только инженеры
      const usersSnapshot = await getDocs(usersQ);
      console.log(`[ActivityChart] Получено инженеров: ${usersSnapshot.size}`);

      const ordersRef = collection(db, 'orders');
      const ordersQ = query(ordersRef, 
                            where("status", "in", ["выполнен", "completed"]), 
                            where('createdAt', '>=', Timestamp.fromDate(startDate)), 
                            where('createdAt', '<=', Timestamp.fromDate(endDate))); 
      const ordersSnapshot = await getDocs(ordersQ);
      console.log(`[ActivityChart] Получено выполненных заказов за период: ${ordersSnapshot.size}`);
      if (ordersSnapshot.size > 0 && ordersSnapshot.size < 5) { // Логируем несколько документов для примера
        ordersSnapshot.docs.forEach(doc => console.log('[ActivityChart] Документ выполненного заказа:', doc.id, doc.data()));
      }

      const activityMap: { [userId: string]: number } = {};
      ordersSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.assignedTo) {
          activityMap[data.assignedTo] = (activityMap[data.assignedTo] || 0) + 1;
        }
      });
      console.log('[ActivityChart] Карта активности (сырые данные):', activityMap);

      const data: EmployeeActivity[] = [];
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        data.push({
          name: user.name || 'Без имени',
          completedOrders: activityMap[doc.id] || 0,
        });
      });
      console.log('[ActivityChart] Финальные данные для графика активности:', data);
      setEmployeeActivity(data);
    } catch (error) {
      console.error("[ActivityChart] Ошибка при загрузке данных об активности сотрудников:", error);
      setError("Ошибка загрузки графика активности сотрудников");
    } finally {
      setLoadingActivityChart(false);
      console.log('[ActivityChart] Загрузка данных для графика активности завершена.');
    }
  };
  
  // Загрузка всех данных при монтировании и при изменении основного периода (если нужно)
  // Для карточек оставим загрузку при монтировании
  useEffect(() => {
    async function fetchCardData() {
      console.log('[Cards] Начало загрузки данных для карточек...');
      setLoadingCards(true);
      setError(null); // Сбрасываем общую ошибку перед новой загрузкой
      try {
        setEmployeesCount(await getEmployeesCount());
        setOrdersCount(await getOrdersCount());
        setTotalIncome(await getTotalIncome());
        setTotalEmployeeActivity(await getTotalEmployeeActivity());
        console.log('[Cards] Данные для карточек успешно загружены.');
      } catch (error) {
        console.error("[Cards] Ошибка при загрузке данных для карточек:", error);
        setError(`Ошибка при загрузке данных для карточек: ${(error as Error).message}`);
      } finally {
        setLoadingCards(false);
        console.log('[Cards] Загрузка данных для карточек завершена.');
      }
    }
    fetchCardData();
  }, []);

  // Обновление данных для графиков при изменении их периодов
  useEffect(() => {
    loadOrderData();
  }, [orderPeriod]);

  useEffect(() => {
    loadIncomeData();
  }, [incomePeriod]);

  useEffect(() => {
    loadEmployeeActivityData();
  }, [activityPeriod]);

  // Данные для графика заказов
  const orderChartData = {
    labels: orderData.map(item => item.date),
    datasets: [
      {
        label: 'Количество заказов',
        data: orderData.map(item => item.count),
        fill: false,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
      },
    ],
  };

  // Данные для графика доходов
  const incomeChartData = {
    labels: incomeData.map(item => item.date),
    datasets: [
      {
        label: 'Доход (₽)',
        data: incomeData.map(item => item.amount),
        fill: false,
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(153, 102, 255, 1)',
        pointHoverRadius: 6,
      },
    ],
  };

  // Данные для графика активности сотрудников
  const activityChartData = {
    labels: employeeActivity.map(item => item.name),
    datasets: [
      {
        label: 'Выполненные заказы',
        data: employeeActivity.map(item => item.completedOrders),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.6,
      },
    ],
  };

  // Опции для графиков
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          color: 'rgba(200, 200, 200, 0.2)',
        },
        ticks: {
          font: {
            family: 'Montserrat',
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(200, 200, 200, 0.2)',
        },
        ticks: {
          font: {
            family: 'Montserrat',
            size: 12,
          },
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 20,
          padding: 15,
          font: {
            family: 'Montserrat',
            size: 14,
            weight: 500,
          },
          pointStyle: 'circle',
        },
        title: {
          text: 'Легенда',
          display: false,
          color: '#555',
          font: {
            family: 'Montserrat',
            size: 16,
            weight: 700,
          },
        },
      },
      tooltip: {
        titleFont: {
          family: 'Montserrat',
          size: 14,
        },
        bodyFont: {
          family: 'Montserrat',
          size: 13,
        },
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 10,
        cornerRadius: 6,
      },
    },
  };

  // Функция получения количества сотрудников (инженеры и диспетчеры)
  async function getEmployeesCount() {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where("role", "in", ["engineer", "dispatcher"]));
    const snapshot = await getDocs(q);
    return snapshot.size;
  }
  // Функция получения общего количества заказов
  async function getOrdersCount() {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    return snapshot.size;
  }
  // Функция получения общей суммы дохода
  async function getTotalIncome() {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    let total = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.paymentStatus === "оплачен" && data.price) {
        total += Number(data.price);
      }
    });
    return total;
  }

  // Функция получения общего количества выполненных заказов (для карточки)
  async function getTotalEmployeeActivity() {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);
    let total = 0;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.status === 'выполнен' || data.status === 'completed') {
        total += 1;
      }
    });
    return total;
  }

  return (
    <div className="home-page">
      <h2>Добро пожаловать в панель администратора!</h2>
      <p>Управляйте данными X-Гидрант из этого интерфейса.</p>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-content">
            <h3>Сотрудники</h3>
            <p>Всего: {loadingCards ? '...' : employeesCount}</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 3V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V7L17 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V15" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-content">
            <h3>Заказы</h3>
            <p>Всего: {loadingCards ? '...' : ordersCount}</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2V22" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-content">
            <h3>Доход</h3>
            <p>Всего: {loadingCards ? '...' : `${totalIncome.toLocaleString()} ₽`}</p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="card-content">
            <h3>Активность сотрудников</h3>
            <p>Выполнено заказов: {loadingCards ? '...' : totalEmployeeActivity}</p>
          </div>
        </div>
      </div>

      {/* График заказов */}
      <div className="chart-section">
        <div className="chart-header">
          <h3>Количество заказов</h3>
          <div className="period-filters">
            <button 
              className={orderPeriod === 'day' ? 'active' : ''} 
              onClick={() => setOrderPeriod('day')}
            >
              День
            </button>
            <button 
              className={orderPeriod === 'week' ? 'active' : ''} 
              onClick={() => setOrderPeriod('week')}
            >
              Неделя
            </button>
            <button 
              className={orderPeriod === 'month' ? 'active' : ''} 
              onClick={() => setOrderPeriod('month')}
            >
              Месяц
            </button>
          </div>
        </div>
        <div className="chart-container">
          {loadingOrdersChart ? <div className="loading-indicator">Загрузка данных...</div> : <Line data={orderChartData} options={chartOptions} height={300} />}
        </div>
      </div>

      {/* График доходов */}      
      <div className="chart-section">
        <div className="chart-header">
          <h3>Прибыль</h3>
          <div className="period-filters">
            <button 
              className={incomePeriod === 'day' ? 'active' : ''} 
              onClick={() => setIncomePeriod('day')}
            >
              День
            </button>
            <button 
              className={incomePeriod === 'week' ? 'active' : ''} 
              onClick={() => setIncomePeriod('week')}
            >
              Неделя
            </button>
            <button 
              className={incomePeriod === 'month' ? 'active' : ''} 
              onClick={() => setIncomePeriod('month')}
            >
              Месяц
            </button>
          </div>
        </div>
        <div className="chart-container">
          {loadingIncomeChart ? <div className="loading-indicator">Загрузка данных...</div> : <Line data={incomeChartData} options={chartOptions} height={300} />}
        </div>
      </div>

      {/* График активности сотрудников */}
      <div className="chart-section">
        <div className="chart-header">
          <h3>Активность сотрудников</h3>
          <div className="period-filters">
            <button 
              className={activityPeriod === 'day' ? 'active' : ''} 
              onClick={() => setActivityPeriod('day')}
            >
              День
            </button>
            <button 
              className={activityPeriod === 'week' ? 'active' : ''} 
              onClick={() => setActivityPeriod('week')}
            >
              Неделя
            </button>
            <button 
              className={activityPeriod === 'month' ? 'active' : ''} 
              onClick={() => setActivityPeriod('month')}
            >
              Месяц
            </button>
          </div>
        </div>
        <div className="chart-container">
          {loadingActivityChart ? <div className="loading-indicator">Загрузка данных...</div> : <Bar data={activityChartData} options={chartOptions} height={300} />}
        </div>
      </div>
    </div>
  );
};

export default Home; 