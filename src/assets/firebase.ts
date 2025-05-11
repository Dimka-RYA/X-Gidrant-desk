import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBOF_HxpxOCe3uYjMijYTccsTX94HPHpeA",
  authDomain: "x-gidrant.firebaseapp.com",
  projectId: "x-gidrant",
  storageBucket: "x-gidrant.firebasestorage.app",
  messagingSenderId: "553290244816",
  appId: "1:553290244816:android:76954338d7605fdaa5b4d5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app; 