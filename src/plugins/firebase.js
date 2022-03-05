import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore/lite';
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from 'firebase/database';

// import { firebaseConfig } from './config';
import 'firebase/firestore';


// Initialize Firebase
const app = initializeApp({
    apiKey: process.env.VUE_APP_FB_API_KEY,
    authDomain: process.env.VUE_APP_FB_AUTH_DOMAIN,
    projectId: process.env.VUE_APP_FB_PROJECT_ID,
    storageBucket: "gist-dc9f5.appspot.com",
    messagingSenderId: "845519359695",
    appId: process.env.VUE_APP_FB_APP_ID,
    measurementId: process.env.VUE_APP_FB_MEASURE_ID,
    databaseURL: "https://gist-dc9f5-default-rtdb.asia-southeast1.firebasedatabase.app"
});
export const analytics = getAnalytics(app);
export const firestore = getFirestore(app)
export const db = getDatabase(app);
