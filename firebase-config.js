// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
