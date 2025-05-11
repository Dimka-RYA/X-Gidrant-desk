<<<<<<< HEAD
# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

# Настройка Firebase для X-Гидрант

## Шаги настройки Firebase

1. **Создайте проект Firebase**
   - Перейдите на [console.firebase.google.com](https://console.firebase.google.com)
   - Создайте новый проект с названием "x-gidrant"

2. **Настройка Authentication**
   - Включите Email/Password аутентификацию
   - Создайте пользователя с email `admin@xgidrant.com` и паролем `admin123`

3. **Настройка Firestore Database**
   - Создайте Firestore Database
   - Создайте коллекцию `users`
   - **ВАЖНО:** Для получения UID пользователя, войдите в раздел Authentication в консоли Firebase, найдите пользователя admin@xgidrant.com и скопируйте его UID
   - Добавьте документ в коллекцию `users` с ID, точно соответствующим UID этого пользователя
   - В документе добавьте поле `role` со значением `admin`

```js
// Пример документа пользователя в Firestore
{
  "role": "admin",
  "name": "Администратор"
}
```

## Отладка проблем с авторизацией

Если у вас возникают проблемы с входом:

1. Откройте консоль разработчика в браузере (F12)
2. Проверьте вывод в консоли при попытке входа
3. Убедитесь, что:
   - UID пользователя в Authentication совпадает с ID документа в коллекции `users`
   - Поле `role` в документе имеет точное значение `admin` (без пробелов, с правильным регистром)

## Проверка настройки

1. После настройки Firebase, запустите приложение
2. Введите учетные данные администратора:
   - Email: admin@xgidrant.com
   - Пароль: admin123
3. Приложение должно успешно выполнить вход и проверку прав доступа

## Запуск приложения

```
npx tauri dev
```
=======
# X-Gidrant-desk
>>>>>>> 310ef2e9218e467bf8efbdbe73c6137ec5f15b65
