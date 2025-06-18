import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Minus, Square, X } from 'lucide-react';
import '../styles/TitleBar.css';
import logoImage from '../assets/logo_final.png';

// Компонент верхней панели окна приложения (TitleBar)
const TitleBar: React.FC = () => {
  // Функция для сворачивания окна
  const handleMinimize = async () => {
    await invoke('minimize_window');
  };

  // Функция для разворачивания/восстановления окна
  const handleMaximize = async () => {
    await invoke('toggle_maximize');
  };

  // Функция для закрытия окна
  const handleClose = async () => {
    await invoke('close_window');
  };

  // Возвращаем разметку верхней панели
  return (
    <div className="title-bar" data-tauri-drag-region>
      {/* Левая часть панели: логотип и название */}
      <div className="title-bar-left">
        <div className="title-bar-icon">
          <img src={logoImage} alt="X-Гидрант логотип" width="20" height="20" />
        </div>
        <div className="title-bar-title">X-Гидрант</div>
      </div>
      {/* Правая часть панели: кнопки управления окном */}
      <div className="title-bar-controls">
        {/* Кнопка свернуть окно */}
        <button className="title-bar-button minimize" onClick={handleMinimize} title="Свернуть">
          <Minus size={14} color="white" strokeWidth={2.5} style={{ color: 'white' }} />
        </button>
        {/* Кнопка развернуть/восстановить окно */}
        <button className="title-bar-button maximize" onClick={handleMaximize} title="Развернуть">
          <Square size={14} color="white" strokeWidth={2.5} style={{ color: 'white' }} />
        </button>
        {/* Кнопка закрыть окно */}
        <button className="title-bar-button close" onClick={handleClose} title="Закрыть">
          <X size={14} color="white" strokeWidth={2.5} style={{ color: 'white' }} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 