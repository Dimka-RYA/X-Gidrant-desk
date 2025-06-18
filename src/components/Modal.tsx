import React from 'react';
import '../styles/Modal.css';

// Описание свойств, которые получает Modal от родителя
interface ModalProps {
  isOpen: boolean; // открыто ли модальное окно
  onClose: () => void; // функция для закрытия окна
  children: React.ReactNode; // содержимое модального окна
}

// Основная функция модального окна
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  // Если модальное окно не открыто — ничего не показываем
  if (!isOpen) {
    return null;
  }

  // Возвращаем разметку модального окна
  return (
    // Затемнённая подложка, клик по ней закрывает окно
    <div className="modal-overlay" onClick={onClose}>
      {/* Само окно. Клик внутри окна не закрывает его */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Кнопка закрытия окна */}
        <button className="modal-close-button" onClick={onClose}>&times;</button>
        {/* Содержимое окна (например, форма) */}
        {children}
      </div>
    </div>
  );
};

export default Modal; 