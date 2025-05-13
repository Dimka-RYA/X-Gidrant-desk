import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import '../../styles/pages/Statistics.css';

// Регистрация компонентов ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const Statistics: React.FC = () => {
  const [activeView, setActiveView] = useState('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

  // Пример данных для графика
  const chartData = {
    labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    datasets: [
      {
        label: 'Продажи',
        data: [65, 59, 80, 81, 56, 55, 40],
        fill: false,
        borderColor: '#D04E4E',
        tension: 0.4,
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
      y: {
        beginAtZero: true,
      },
    },
  };

  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  const statisticsData = [
    {
      title: 'Общая выручка',
      value: '₽145,230',
      trend: '+12.5%',
      isPositive: true,
    },
    {
      title: 'Количество заказов',
      value: '1,234',
      trend: '+8.3%',
      isPositive: true,
    },
    {
      title: 'Средний чек',
      value: '₽890',
      trend: '-2.1%',
      isPositive: false,
    },
    {
      title: 'Новые клиенты',
      value: '48',
      trend: '+15.7%',
      isPositive: true,
    },
  ];

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="statistics-page">
      <div className="page-header">
        <h2>Статистика</h2>
      </div>

      <div className="toggle-container">
        <button
          className={`toggle-button ${activeView === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveView('daily')}
        >
          День
        </button>
        <button
          className={`toggle-button ${activeView === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveView('weekly')}
        >
          Неделя
        </button>
        <button
          className={`toggle-button ${activeView === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveView('monthly')}
        >
          Месяц
        </button>
      </div>

      <div className="statistics-grid">
        {statisticsData.map((stat, index) => (
          <div key={index} className="stat-card">
            <h3>{stat.title}</h3>
            <p className="stat-value">{stat.value}</p>
            <div className={`stat-trend ${stat.isPositive ? 'trend-up' : 'trend-down'}`}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      <div className="chart-container">
        <div className="chart-header">
          <h3 className="chart-title">Динамика продаж</h3>
          <select
            className="chart-period-select"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="week">За неделю</option>
            <option value="month">За месяц</option>
            <option value="quarter">За квартал</option>
          </select>
        </div>
        <Line data={chartData} options={chartOptions} />
      </div>

      <div className="table-container">
        <table className="statistics-table">
          <thead>
            <tr>
              <th>Наименование</th>
              <th>Количество</th>
              <th>Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Товар 1</td>
              <td>24</td>
              <td>₽12,400</td>
              <td>Выполнен</td>
            </tr>
            <tr>
              <td>Товар 2</td>
              <td>18</td>
              <td>₽9,600</td>
              <td>В обработке</td>
            </tr>
            <tr>
              <td>Товар 3</td>
              <td>32</td>
              <td>₽16,800</td>
              <td>Выполнен</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Statistics; 