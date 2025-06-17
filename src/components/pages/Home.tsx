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

interface HomeProps {
  userRole: 'admin' | 'dispatcher' | 'user' | 'engineer' | null;
}

const Home: React.FC<HomeProps> = ({ userRole }) => {
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
          const employeeId = data.assignedTo;
          activityMap[employeeId] = (activityMap[employeeId] || 0) + 1;
        }
      });

      const fetchedEmployeeActivity: EmployeeActivity[] = usersSnapshot.docs.map(userDoc => {
        const userId = userDoc.id;
        const userName = userDoc.data().name || 'Неизвестный инженер';
        const completedOrders = activityMap[userId] || 0;
        return { name: userName, completedOrders: completedOrders };
      }).sort((a, b) => b.completedOrders - a.completedOrders);

      setEmployeeActivity(fetchedEmployeeActivity);
    } catch (error) {
      console.error("[ActivityChart] Ошибка при загрузке данных об активности сотрудников:", error);
      setError("Ошибка загрузки графика активности сотрудников");
    } finally {
      setLoadingActivityChart(false);
      console.log('[ActivityChart] Загрузка данных для графика активности завершена.');
    }
  };

  // Загрузка данных при изменении периодов или при монтировании
  useEffect(() => {
    loadOrderData();
  }, [orderPeriod]);

  useEffect(() => {
    loadIncomeData();
  }, [incomePeriod]);

  useEffect(() => {
    loadEmployeeActivityData();
  }, [activityPeriod]);

  // Карточки с основными показателями (Employees, Orders, Income, Employee Activity)
  useEffect(() => {
    async function fetchCardData() {
      setLoadingCards(true);
      try {
        await getEmployeesCount();
        await getOrdersCount();
        await getTotalIncome();
        await getTotalEmployeeActivity();
      } catch (err) {
        console.error("Ошибка загрузки данных карточек:", err);
        setError("Ошибка загрузки основных показателей");
      } finally {
        setLoadingCards(false);
      }
    }

    fetchCardData();
  }, []);

  // Функции для получения данных для карточек
  async function getEmployeesCount() {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(query(usersRef, where("role", "in", ["engineer", "dispatcher"]))); // Подсчет инженеров и диспетчеров
      setEmployeesCount(snapshot.size);
    } catch (error) {
      console.error("Ошибка при подсчете сотрудников:", error);
    }
  }

  async function getOrdersCount() {
    try {
      const ordersRef = collection(db, 'orders');
      const snapshot = await getDocs(ordersRef);
      setOrdersCount(snapshot.size);
    } catch (error) {
      console.error("Ошибка при подсчете заказов:", error);
    }
  }

  async function getTotalIncome() {
    try {
      const ordersRef = collection(db, 'orders');
      const snapshot = await getDocs(query(ordersRef, where('paymentStatus', '==', 'оплачен')));
      let total = 0;
      snapshot.forEach(doc => {
        total += Number(doc.data().price || 0);
      });
      setTotalIncome(total);
    } catch (error) {
      console.error("Ошибка при подсчете общего дохода:", error);
    }
  }

  async function getTotalEmployeeActivity() {
    try {
      const ordersRef = collection(db, 'orders');
      const snapshot = await getDocs(query(ordersRef, where("status", "in", ["выполнен", "completed"])));
      setTotalEmployeeActivity(snapshot.size);
    } catch (error) {
      console.error("Ошибка при подсчете активности сотрудников:", error);
    }
  }

  // Настройки графика
  const orderChartData = {
    labels: orderData.map(data => data.date),
    datasets: [
      {
        label: 'Количество заказов',
        data: orderData.map(data => data.count),
        fill: true,
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const incomeChartData = {
    labels: incomeData.map(data => data.date),
    datasets: [
      {
        label: 'Доход (Р)',
        data: incomeData.map(data => data.amount),
        fill: true,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const employeeActivityChartData = {
    labels: employeeActivity.map(data => data.name),
    datasets: [
      {
        label: 'Выполненные заказы',
        data: employeeActivity.map(data => data.completedOrders),
        backgroundColor: '#6f42c1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return Number.isInteger(value) ? value : null;
          }
        }
      },
    },
  };

  if (userRole === 'user') {
    return (
      <div className="home-container user-dashboard">
        <h2>Добро пожаловать в личный кабинет!</h2>
        <p>Здесь вы сможете просматривать информацию о своих заказах и услугах.</p>
        <p>Для начала, перейдите в раздел "Категории", чтобы ознакомиться с доступными услугами.</p>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="welcome-section">
        <h2>Добро пожаловать в панель администратора!</h2>
        <p>Управляйте данными X-Гидрант из этого интерфейса.</p>
      </div>

      {loadingCards ? (
        <div className="loading-indicator">Загрузка основных показателей...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="card-container">
          <div className="metric-card">
            <div className="card-icon"><i className="fas fa-users"></i></div>
            <div className="card-content">
              <h3>Сотрудники</h3>
              <p>Всего: {employeesCount}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="card-icon"><i className="fas fa-file-invoice"></i></div>
            <div className="card-content">
              <h3>Заказы</h3>
              <p>Всего: {ordersCount}</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="card-icon"><i className="fas fa-dollar-sign"></i></div>
            <div className="card-content">
              <h3>Доход</h3>
              <p>Всего: {totalIncome} Р</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="card-icon"><i className="fas fa-chart-line"></i></div>
            <div className="card-content">
              <h3>Активность сотрудников</h3>
              <p>Выполнено заказов: {totalEmployeeActivity}</p>
            </div>
          </div>
        </div>
      )}

      <div className="charts-section">
        <div className="chart-card">
          <h3>Количество заказов</h3>
          <div className="chart-controls">
            <button onClick={() => setOrderPeriod('day')} className={orderPeriod === 'day' ? 'active' : ''}>День</button>
            <button onClick={() => setOrderPeriod('week')} className={orderPeriod === 'week' ? 'active' : ''}>Неделя</button>
            <button onClick={() => setOrderPeriod('month')} className={orderPeriod === 'month' ? 'active' : ''}>Месяц</button>
          </div>
          {loadingOrdersChart ? (
            <div className="loading-indicator">Загрузка графика заказов...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <Line data={orderChartData} options={chartOptions} />
          )}
        </div>

        <div className="chart-card">
          <h3>Прибыль</h3>
          <div className="chart-controls">
            <button onClick={() => setIncomePeriod('day')} className={incomePeriod === 'day' ? 'active' : ''}>День</button>
            <button onClick={() => setIncomePeriod('week')} className={incomePeriod === 'week' ? 'active' : ''}>Неделя</button>
            <button onClick={() => setIncomePeriod('month')} className={incomePeriod === 'month' ? 'active' : ''}>Месяц</button>
          </div>
          {loadingIncomeChart ? (
            <div className="loading-indicator">Загрузка графика доходов...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <Line data={incomeChartData} options={chartOptions} />
          )}
        </div>
        
        <div className="chart-card employee-activity-chart">
          <h3>Активность сотрудников</h3>
          <div className="chart-controls">
            <button onClick={() => setActivityPeriod('day')} className={activityPeriod === 'day' ? 'active' : ''}>День</button>
            <button onClick={() => setActivityPeriod('week')} className={activityPeriod === 'week' ? 'active' : ''}>Неделя</button>
            <button onClick={() => setActivityPeriod('month')} className={activityPeriod === 'month' ? 'active' : ''}>Месяц</button>
          </div>
          {loadingActivityChart ? (
            <div className="loading-indicator">Загрузка графика активности сотрудников...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <Bar data={employeeActivityChartData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Home; 