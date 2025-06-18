import { useState, useEffect } from 'react';
import { auth, db } from '../assets/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import '../styles/Sidebar.css';

// Описание свойств, которые получает Sidebar от родителя
interface SidebarProps {
  onLogout: () => void; // функция для выхода из аккаунта
  onChangeTab: (tab: string) => void; // функция для смены вкладки
  activeTab?: string; // название активной вкладки
  userRole: 'admin' | 'user' | null; // роль пользователя
}

// Основная функция боковой панели
const Sidebar = ({ onLogout, onChangeTab, activeTab = 'главная', userRole }: SidebarProps) => {
  // activeItem — текущий выбранный пункт меню
  const [activeItem, setActiveItem] = useState(activeTab);
  // username — имя пользователя, отображаемое внизу панели
  const [username, setUsername] = useState('пользователь');
  // collapsed — состояние: свернута ли боковая панель
  const [collapsed, setCollapsed] = useState(false);
  
  // При изменении пользователя получаем его имя из Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Если есть имя пользователя, устанавливаем его
        if (user.displayName) {
          setUsername(user.displayName);
        }
        
        // Получаем имя пользователя из Firestore (роль уже передается через пропс)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.name) {
              setUsername(userData.name);
            }
          }
        } catch (error) {
          console.error('Ошибка при получении данных пользователя:', error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  // Следим за изменением активной вкладки от родителя
  useEffect(() => {
    if (activeTab !== activeItem) {
      setActiveItem(activeTab);
    }
  }, [activeTab]);
  
  // Функция выхода из аккаунта
  const handleLogout = async () => {
    try {
      await signOut(auth);
      onLogout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  // Функция обработки клика по пункту меню
  const handleItemClick = (item: string) => {
    console.log('Menu item clicked:', item);
    setActiveItem(item);
    onChangeTab(item);
  };
  
  // Вспомогательная функция: разрешён ли пункт меню для текущей роли
  const isTabAllowed = (tabRoles: Array<'admin' | 'user'>) => {
    return userRole && tabRoles.includes(userRole);
  };

  // Возвращаем разметку боковой панели
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Кнопка для сворачивания/разворачивания панели */}
      <button className="toggle-button" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">
        {collapsed ? (
          // Иконка для развернутой панели
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 17L15 12L10 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          // Иконка для свернутой панели
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 17L9 12L14 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>
      
      {/* Меню с пунктами */}
      <div className="sidebar-menu">
        {/* Главная — доступна всем */}
        <div 
          className={`menu-item ${activeItem === 'главная' ? 'active' : ''}`}
          onClick={() => handleItemClick('главная')}
        >
          <div className="menu-icon">
            {/* Иконка "Главная" */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L3 9V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V9L12 2Z" stroke={activeItem === 'главная' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className={activeItem === 'главная' ? 'active-text' : ''}>Главная</span>
        </div>
        
        {/* Пункт меню "Сотрудники" - показывается только для админов */}
        {isTabAllowed(['admin']) && (
          <div 
            className={`menu-item ${activeItem === 'сотрудники' ? 'active' : ''}`}
            onClick={() => handleItemClick('сотрудники')}
          >
            <div className="menu-icon">
              {/* Иконка "Сотрудники" */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 4C16.0609 4 17.0783 4.42143 17.8284 5.17157C18.5786 5.92172 19 6.93913 19 8C19 9.06087 18.5786 10.0783 17.8284 10.8284C17.0783 11.5786 16.0609 12 15 12C13.9391 12 12.9217 11.5786 12.1716 10.8284C11.4214 10.0783 11 9.06087 11 8C11 6.93913 11.4214 5.92172 12.1716 5.17157C12.9217 4.42143 13.9391 4 15 4Z" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 8C8.10457 8 9 7.10457 9 6C9 4.89543 8.10457 4 7 4C5.89543 4 5 4.89543 5 6C5 7.10457 5.89543 8 7 8Z" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 20C21 18.1435 20.2625 16.363 18.9497 15.0503C17.637 13.7375 15.8565 13 14 13C12.1435 13 10.363 13.7375 9.05025 15.0503C7.7375 16.363 7 18.1435 7 20" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 20C3 18.9391 3.42143 17.9217 4.17157 17.1716C4.92172 16.4214 5.93913 16 7 16" stroke={activeItem === 'сотрудники' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'сотрудники' ? 'active-text' : ''}>Сотрудники</span>
          </div>
        )}
        
        {/* Пункт меню "Заказы" - показывается только для админов */}
        {isTabAllowed(['admin']) && (
          <div 
            className={`menu-item ${activeItem === 'заказы' ? 'active' : ''}`}
            onClick={() => handleItemClick('заказы')}
          >
            <div className="menu-icon">
              {/* Иконка "Заказы" */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 3V19C5 19.5304 5.21071 20.0391 5.58579 20.4142C5.96086 20.7893 6.46957 21 7 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V7L17 3H7C6.46957 3 5.96086 3.21071 5.58579 3.58579C5.21071 3.96086 5 4.46957 5 5V15" stroke={activeItem === 'заказы' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'заказы' ? 'active-text' : ''}>Заказы</span>
          </div>
        )}
        
        {/* Пункт меню "Клиенты" - показывается только для админов */}
        {isTabAllowed(['admin']) && (
          <div 
            className={`menu-item ${activeItem === 'клиенты' ? 'active' : ''}`}
            onClick={() => handleItemClick('клиенты')}
          >
            <div className="menu-icon">
              {/* Иконка "Клиенты" */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke={activeItem === 'клиенты' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'клиенты' ? 'active-text' : ''}>Клиенты</span>
          </div>
        )}
        
        {/* Пункт меню "Доход" - показываем только для роли админа */}
        {isTabAllowed(['admin']) && (
          <div 
            className={`menu-item ${activeItem === 'доход' ? 'active' : ''}`}
            onClick={() => handleItemClick('доход')}
          >
            <div className="menu-icon">
              {/* Иконка "Доход" */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2V22" stroke={activeItem === 'доход' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke={activeItem === 'доход' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'доход' ? 'active-text' : ''}>Доход</span>
          </div>
        )}

        {/* Пункт меню "Категории" - показывается только для роли пользователя */}
        {isTabAllowed(['user']) && (
          <div 
            className={`menu-item ${activeItem === 'категории' ? 'active' : ''}`}
            onClick={() => handleItemClick('категории')}
          >
            <div className="menu-icon">
              {/* Иконка "Категории" */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H7" stroke={activeItem === 'категории' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M17 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V7" stroke={activeItem === 'категории' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 17V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H17" stroke={activeItem === 'категории' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V17" stroke={activeItem === 'категории' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.5 10.5L12 13L9.5 10.5" stroke={activeItem === 'категории' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 13V15" stroke={activeItem === 'категории' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'категории' ? 'active-text' : ''}>Категории</span>
          </div>
        )}

        {/* New: Пункт меню "История заказов" - показывается только для роли пользователя */}
        {isTabAllowed(['user']) && (
          <div 
            className={`menu-item ${activeItem === 'история-заказов' ? 'active' : ''}`}
            onClick={() => handleItemClick('история-заказов')}
          >
            <div className="menu-icon">
              {/* Иконка "История заказов" */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2Z" stroke={activeItem === 'история-заказов' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 6V12L16 14" stroke={activeItem === 'история-заказов' ? '#D04E4E' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={activeItem === 'история-заказов' ? 'active-text' : ''}>История заказов</span>
          </div>
        )}
      </div>
      
      {/* Нижняя часть панели: информация о пользователе и кнопка выхода */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {/* Иконка пользователя */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="user-name">{username}</span>
          <div className="user-role">{userRole === 'admin' ? 'Администратор' : userRole === 'user' ? 'Пользователь' : ''}</div>
          <button className="logout-button" onClick={handleLogout} title="Выйти">
            {/* Иконка выхода */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 17L21 12L16 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12H9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;