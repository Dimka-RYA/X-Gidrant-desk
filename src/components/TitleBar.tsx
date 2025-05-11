import React from 'react';
import { invoke } from '@tauri-apps/api/core';
import '../styles/TitleBar.css';
import logoImage from '../assets/logo_final.png';

const TitleBar: React.FC = () => {
  const handleMinimize = async () => {
    await invoke('minimize_window');
  };

  const handleMaximize = async () => {
    await invoke('toggle_maximize');
  };

  const handleClose = async () => {
    await invoke('close_window');
  };

  return (
    <div className="title-bar" data-tauri-drag-region>
      <div className="title-bar-left">
        <div className="title-bar-icon">
          <img src={logoImage} alt="X-Гидрант логотип" width="20" height="20" />
        </div>
        <div className="title-bar-title">X-Гидрант</div>
      </div>
      <div className="title-bar-controls">
        <button className="title-bar-button minimize" onClick={handleMinimize} title="Свернуть">
          <span className="control-icon">−</span>
        </button>
        <button className="title-bar-button maximize" onClick={handleMaximize} title="Развернуть">
          <span className="control-icon">□</span>
        </button>
        <button className="title-bar-button close" onClick={handleClose} title="Закрыть">
          <span className="control-icon">×</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 