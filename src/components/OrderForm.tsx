import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore'; // Import Firestore functions
import '../styles/OrderForm.css';
import { auth, db } from '../assets/firebase';

interface OrderFormProps {
  serviceTitle: string;
  onClose: () => void;
  onOrderSuccess: () => void; // Changed from onOrderSubmit to onOrderSuccess
}

const OrderForm: React.FC<OrderFormProps> = ({ serviceTitle, onClose, onOrderSuccess }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove non-digits
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const user = auth.currentUser; // Get current user
    if (!user) {
      alert("Для оформления заказа необходимо войти в систему.");
      return;
    }

    const orderData = {
      serviceTitle,
      name,
      address,
      phone,
      paymentMethod,
      userId: user.uid, // Add user ID
      userEmail: user.email, // Add user email
      timestamp: new Date(), // Add timestamp
      status: "В обработке", // Initial status
      price: 0, // Placeholder, actual price could come from service object
      currency: "руб.", // Placeholder
      description: "", // Placeholder
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      console.log("Заказ успешно добавлен в Firestore!");
      onOrderSuccess(); // Call success callback
      onClose(); // Close the modal
    } catch (error) {
      console.error("Ошибка при добавлении заказа в Firestore:", error);
      alert("Ошибка при оформлении заказа. Пожалуйста, попробуйте еще раз.");
    }
  };

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