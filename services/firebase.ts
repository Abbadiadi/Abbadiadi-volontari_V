
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyA3yyNPkWWqWxkj9VGR391bnLyrSr-wTg4",
    authDomain: "gestione-volontari-evento.firebaseapp.com",
    projectId: "gestione-volontari-evento",
    storageBucket: "gestione-volontari-evento.appspot.com",
    messagingSenderId: "507852528635",
    appId: "1:507852528635:web:d6de64b7c45b943892895e",
    measurementId: "G-Z2B36R1WXR"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
