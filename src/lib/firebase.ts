import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC_09gTMNbLSwfAjWrqW3A5ehoqSXGklmE",
    authDomain: "handball-stats-ab84e.firebaseapp.com",
    projectId: "handball-stats-ab84e",
    storageBucket: "handball-stats-ab84e.firebasestorage.app",
    messagingSenderId: "948752971118",
    appId: "1:948752971118:web:4de735ba51f39d73097d7f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
