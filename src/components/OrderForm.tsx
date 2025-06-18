import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore'; // Import Firestore functions
import '../styles/OrderForm.css';
import { auth, db } from '../assets/firebase';

// Описание свойств, которые получает OrderForm от родителя
interface OrderFormProps {
  serviceTitle: string; // название услуги
  onClose: () => void; // функция для закрытия формы
  onOrderSuccess: () => void; // функция, вызывается при успешном заказе
}

// Основная функция формы заказа услуги
const OrderForm: React.FC<OrderFormProps> = ({ serviceTitle, onClose, onOrderSuccess }) => {
  // name — имя пользователя
  const [name, setName] = useState('');
  // address — адрес пользователя
  const [address, setAddress] = useState('');
  // phone — номер телефона пользователя
  const [phone, setPhone] = useState('');
  // paymentMethod — выбранный способ оплаты
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Функция для обработки изменения поля "телефон" (форматирует ввод)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Удаляем все нецифры
    let formattedInput = '';
    if (input.length > 0) {
      formattedInput = '+' + input.substring(0, 1);
      if (input.length > 1) {
        formattedInput += ' (' + input.substring(1, 4);
      }
      if (input.length > 4) {
        formattedInput += ') ' + input.substring(4, 7);
      }
      if (input.length > 7) {
        formattedInput += '-' + input.substring(7, 9);
      }
      if (input.length > 9) {
        formattedInput += '-' + input.substring(9, 11);
      }
    }
    setPhone(formattedInput);
  };

  // Функция отправки формы заказа
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Отменяем стандартное поведение формы

    const user = auth.currentUser; // Получаем текущего пользователя
    if (!user) {
      alert("Для оформления заказа необходимо войти в систему.");
      return;
    }

    // Данные заказа, которые будут отправлены в базу данных
    const orderData = {
      serviceTitle,
      name,
      address,
      phone,
      paymentMethod,
      userId: user.uid, // ID пользователя
      userEmail: user.email, // Email пользователя
      timestamp: new Date(), // Время заказа
      status: "В обработке", // Статус заказа
      price: 0, // Заглушка для цены
      currency: "руб.", // Валюта
      description: "", // Описание (пустое)
    };

    try {
      // Добавляем заказ в коллекцию "orders" в Firestore
      await addDoc(collection(db, 'orders'), orderData);
      console.log("Заказ успешно добавлен в Firestore!");
      onOrderSuccess(); // Вызываем функцию успеха
      onClose(); // Закрываем форму
    } catch (error) {
      console.error("Ошибка при добавлении заказа в Firestore:", error);
      alert("Ошибка при оформлении заказа. Пожалуйста, попробуйте еще раз.");
    }
  };

  // Возвращаем разметку формы заказа
  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h3>Заказ услуги: {serviceTitle}</h3>
      <div className="form-group">
        <label htmlFor="name">Ваше имя:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="address">Адрес:</label>
        <input
          type="text"
          id="address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="phone">Номер телефона:</label>
        <input
          type="tel"
          id="phone"
          value={phone}
          onChange={handlePhoneChange}
          placeholder="+7 (XXX) XXX-XX-XX"
          maxLength={18} // +7 (XXX) XXX-XX-XX is 18 characters
          required
        />
      </div>
      <div className="form-group">
        <label htmlFor="paymentMethod">Способ оплаты:</label>
        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="cash">Наличные</option>
          <option value="card_online">Онлайн-оплата картой</option>
          <option value="card_onsite">Оплата картой на месте</option>
        </select>
      </div>
      <div className="form-actions">
        <button type="submit" className="submit-button">Оформить заказ</button>
        <button type="button" className="cancel-button" onClick={onClose}>Отмена</button>
      </div>
    </form>
  );
};

export default OrderForm; 