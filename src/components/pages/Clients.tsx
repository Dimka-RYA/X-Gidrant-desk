import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../assets/firebase';
import '../../styles/pages/Clients.css';

// Описание типа клиента
interface Client {
  id: string; // уникальный идентификатор клиента
  name: string; // имя клиента
  contact: string; // контактное лицо
  phone: string; // телефон
  email: string; // email
  orders: number; // количество заказов
}

// Описание состояния редактируемой ячейки
interface EditingCell {
  clientId: string;
  field: keyof Client;
  value: string | number;
}

// Иконка редактирования
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#4e8fd0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="#4e8fd0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Иконка удаления
const DeleteIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6H5H21" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#D04E4E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Основная функция страницы клиентов
const Clients: React.FC = () => {
  // clients — список всех клиентов
  const [clients, setClients] = useState<Client[]>([]);
  // loading — идёт ли сейчас загрузка
  const [loading, setLoading] = useState<boolean>(true);
  // error — текст ошибки, если есть
  const [error, setError] = useState<string | null>(null);
  // editingCell — информация о редактируемой ячейке
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  // columnWidths — ширина столбцов (для ресайза)
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({});
  // deleteConfirmOpen — открыто ли окно подтверждения удаления
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  // clientToDelete — id клиента, которого хотим удалить
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  // notification — текст уведомления
  const [notification, setNotification] = useState<string | null>(null);
  // tableRef — ссылка на таблицу
  const tableRef = useRef<HTMLTableElement>(null);
  // resizingColumn — id столбца, который сейчас изменяется
  const resizingColumn = useRef<string | null>(null);
  // initialWidth — начальная ширина столбца
  const initialWidth = useRef<number>(0);
  // startClientX — начальная позиция мыши
  const startClientX = useRef<number>(0);
  // resizeLineRef — ссылка на линию изменения размера
  const resizeLineRef = useRef<HTMLDivElement | null>(null);
  
  // Получаем список клиентов из Firestore при первом рендере
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        // Получаем всех пользователей из коллекции users
        const usersRef = collection(db, 'users');
        
        // Выводим отладочную информацию
        console.log("Запрос к коллекции users инициирован");
        
        // Получаем все документы без фильтрации
        const querySnapshot = await getDocs(usersRef);
        
        console.log("Получено документов:", querySnapshot.size);
        
        const clientsData: Client[] = [];
        
        // Обрабатываем каждый документ и подсчитываем заказы
        for (const userDoc of querySnapshot.docs) {
          console.log("Документ ID:", userDoc.id);
          const data = userDoc.data();
          console.log("Данные документа:", data);
          
          // Если у пользователя роль admin или engineer, пропускаем его
          if (data.role === 'admin' || data.role === 'engineer' || data.role === 'dispatcher') {
            console.log(`Пропускаем пользователя с ролью ${data.role}`);
            continue;
          }
          
          // Получаем количество заказов из коллекции orders
          const ordersQuery = query(
            collection(db, 'orders'),
            where('userId', '==', userDoc.id)
          );
          
          const ordersSnapshot = await getDocs(ordersQuery);
          const ordersCount = ordersSnapshot.size;
          
          console.log(`Найдено ${ordersCount} заказов для пользователя ${userDoc.id}`);
          
          // Добавляем пользователя в список клиентов
          clientsData.push({
            id: userDoc.id,
            name: data.name || 'Не указано',
            contact: data.contact || 'Не указано',
            phone: data.phone || 'Не указано',
            email: data.email || 'Не указано',
            orders: ordersCount
          });
        }
        
        console.log("Обработано клиентов:", clientsData.length);
        
        setClients(clientsData);
        setError(null);
      } catch (err) {
        console.error("Ошибка при получении клиентов:", err);
        setError(`Не удалось загрузить список клиентов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  // Создаем линию индикатора один раз при монтировании компонента
  useEffect(() => {
    // Создаем элемент для линии изменения размера
    const resizeLine = document.createElement('div');
    resizeLine.className = 'column-resize-line';
    resizeLine.style.display = 'none';
    document.body.appendChild(resizeLine);
    
    // Сохраняем ссылку на созданный элемент
    resizeLineRef.current = resizeLine;
    
    // Очищаем при размонтировании
    return () => {
      if (resizeLine && document.body.contains(resizeLine)) {
        document.body.removeChild(resizeLine);
      }
    };
  }, []);

  // Обработчик начала изменения размера столбца
  const handleResizeStart = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!tableRef.current) return;
    
    // Ищем нужную ячейку заголовка
    const headerCell = tableRef.current.querySelector(`th[data-column="${columnId}"]`) as HTMLTableHeaderCellElement;
    if (!headerCell) return;
    
    // Сохраняем данные для изменения размера
    resizingColumn.current = columnId;
    const headerRect = headerCell.getBoundingClientRect();
    initialWidth.current = headerRect.width;
    startClientX.current = e.clientX;
    
    // Показываем линию изменения размера
    if (resizeLineRef.current) {
      const tableRect = tableRef.current.getBoundingClientRect();
      resizeLineRef.current.style.top = `${tableRect.top}px`;
      resizeLineRef.current.style.left = `${headerRect.right}px`;
      resizeLineRef.current.style.height = `${tableRect.height}px`;
      resizeLineRef.current.style.display = 'block';
    }
    
    // Добавляем стиль к телу документа
    document.body.classList.add('resizing');
    
    // Добавляем обработчики для отслеживания движения мыши и отпускания кнопки
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };
  
  // Обработчик движения мыши при изменении размера
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingColumn.current || !resizeLineRef.current || !tableRef.current) return;
    
    // Вычисляем, насколько нужно изменить ширину
    const diff = e.clientX - startClientX.current;
    const newWidth = Math.max(50, initialWidth.current + diff); // Минимальная ширина 50px
    
    // Обновляем положение линии изменения размера
    const headerCell = tableRef.current.querySelector(`th[data-column="${resizingColumn.current}"]`) as HTMLTableHeaderCellElement;
    if (headerCell) {
      const headerRect = headerCell.getBoundingClientRect();
      resizeLineRef.current.style.left = `${headerRect.left + newWidth}px`;
    }
  };
  
  // Обработчик завершения изменения размера
  const handleResizeEnd = () => {
    if (!resizingColumn.current || !tableRef.current || !resizeLineRef.current) return;
    
    // Скрываем линию изменения размера
    resizeLineRef.current.style.display = 'none';
    
    // Удаляем стиль с тела документа
    document.body.classList.remove('resizing');
    
    // Вычисляем новую ширину на основе положения линии
    const lineLeft = parseInt(resizeLineRef.current.style.left);
    const headerCell = tableRef.current.querySelector(`th[data-column="${resizingColumn.current}"]`) as HTMLTableHeaderCellElement;
    
    if (headerCell) {
      const headerRect = headerCell.getBoundingClientRect();
      const newWidth = lineLeft - headerRect.left;
      
      // Применяем ширину ко всем ячейкам в столбце
      const allCells = tableRef.current.querySelectorAll(`[data-column="${resizingColumn.current}"]`);
      allCells.forEach(cell => {
        (cell as HTMLElement).style.width = `${newWidth}px`;
      });
      
      // Сохраняем новую ширину в состоянии
      setColumnWidths(prev => ({
        ...prev,
        [resizingColumn.current as string]: newWidth
      }));
    }
    
    // Сбрасываем данные
    resizingColumn.current = null;
    
    // Удаляем обработчики
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // Обработчик начала редактирования ячейки
  const handleCellClick = (client: Client, field: keyof Client) => {
    // Не редактируем ID и количество заказов
    if (field === 'id' || field === 'orders') return;
    
    setEditingCell({
      clientId: client.id,
      field,
      value: client[field]
    });
  };

  // Обработчик изменения значения в поле ввода
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingCell) return;
    
    setEditingCell({
      ...editingCell,
      value: e.target.value
    });
  };

  // Обработчик завершения редактирования
  const handleInputBlur = async () => {
    if (!editingCell) return;
    
    try {
      // Находим клиента в массиве
      const clientIndex = clients.findIndex(c => c.id === editingCell.clientId);
      if (clientIndex === -1) return;
      
      // Обновляем локальные данные
      const updatedClients = [...clients];
      updatedClients[clientIndex] = {
        ...updatedClients[clientIndex],
        [editingCell.field]: editingCell.value
      };
      
      setClients(updatedClients);
      
      // Обновляем данные в Firebase
      const clientDocRef = doc(db, 'users', editingCell.clientId);
      await updateDoc(clientDocRef, {
        [editingCell.field]: editingCell.value
      });
      
      console.log(`Данные клиента ${editingCell.clientId} обновлены`);
    } catch (err) {
      console.error("Ошибка при обновлении данных клиента:", err);
      // Можно добавить уведомление об ошибке
    } finally {
      setEditingCell(null);
    }
  };

  // Обработчик нажатия клавиши Enter для сохранения изменений
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    }
  };

  // Функция для отображения ячейки таблицы
  const renderCell = (client: Client, field: keyof Client) => {
    // Проверяем, редактируется ли эта ячейка
    const isEditing = 
      editingCell && 
      editingCell.clientId === client.id && 
      editingCell.field === field;
    
    // Если ячейка редактируется, показываем поле ввода
    if (isEditing) {
      return (
        <input
          type="text"
          value={editingCell.value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyPress={handleKeyPress}
          className="cell-input"
          autoFocus
        />
      );
    }
    
    // Иначе показываем обычную ячейку с возможностью клика для редактирования
    return (
      <div 
        className={`cell-content ${field !== 'id' && field !== 'orders' ? 'editable' : ''}`}
        onClick={() => handleCellClick(client, field)}
      >
        {client[field]}
      </div>
    );
  };

  // Добавим обработчик открытия окна подтверждения удаления
  const handleDeleteClick = (clientId: string) => {
    setClientToDelete(clientId);
    setDeleteConfirmOpen(true);
  };

  // Обработчик удаления клиента
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    
    try {
      // Удаляем клиента из Firebase (помечаем как удалённого)
      await updateDoc(doc(db, 'users', clientToDelete), {
        isDeleted: true
      });
      
      // Удаляем клиента из локального состояния
      setClients(prevClients => prevClients.filter(client => client.id !== clientToDelete));
      
      // Показываем уведомление
      setNotification('Клиент успешно удален');
      
      // Закрываем окно подтверждения
      setDeleteConfirmOpen(false);
      setClientToDelete(null);
    } catch (err) {
      console.error('Ошибка при удалении клиента:', err);
      setNotification('Ошибка при удалении клиента');
    }
  };

  // Закрытие окна подтверждения
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setClientToDelete(null);
  };

  // Возвращаем разметку страницы клиентов
  return (
    <div className="clients-page">
      <div className="page-header">
        {/* Убираем заголовок "Клиенты" */}
      </div>

      <div className="clients-table-container">
        {loading ? (
          <div className="loading-indicator">Загрузка...</div>
        ) : error ? (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={() => window.location.reload()}>Попробовать снова</button>
          </div>
        ) : (
          <table className="clients-table">
            <thead>
              <tr>
                <th>Имя</th>
                <th>Контакт</th>
                <th>Телефон</th>
                <th>Email</th>
                <th>Заказы</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id}>
                  <td>{renderCell(client, 'name')}</td>
                  <td>{renderCell(client, 'contact')}</td>
                  <td>{renderCell(client, 'phone')}</td>
                  <td>{renderCell(client, 'email')}</td>
                  <td>{renderCell(client, 'orders')}</td>
                  <td className="actions-cell">
                    <div className="actions-container">
                      <button 
                        className="action-button edit"
                        onClick={() => handleCellClick(client, 'name')}
                        title="Редактировать"
                      >
                        <EditIcon />
                    </button>
                      <button 
                        className="action-button delete"
                        onClick={() => handleDeleteClick(client.id)}
                        title="Удалить"
                      >
                        <DeleteIcon />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Модальное окно подтверждения удаления */}
      {deleteConfirmOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <div className="confirm-modal-header">
              <h3>Подтверждение удаления</h3>
              <button className="close-button" onClick={closeDeleteConfirm}>×</button>
            </div>
            <div className="confirm-modal-body">
              <p>Вы уверены, что хотите удалить этого клиента?</p>
              <p>Это действие нельзя отменить.</p>
            </div>
            <div className="confirm-modal-footer">
              <button className="cancel-button" onClick={closeDeleteConfirm}>Отмена</button>
              <button className="delete-button" onClick={handleDeleteClient}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {/* Уведомление */}
      {notification && (
        <div className="notification">
          {notification}
          <button className="notification-close" onClick={() => setNotification(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default Clients;