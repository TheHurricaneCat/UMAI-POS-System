// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore";
import { getStorage } from 'firebase/storage';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCLVKs5SzXiDv5Qp2wSHe_0e9w4jhWmg1A",
  authDomain: "catsup-cloud.firebaseapp.com",
  projectId: "catsup-cloud",
  storageBucket: "catsup-cloud.appspot.com",
  messagingSenderId: "393754765381",
  appId: "1:393754765381:web:62348da02ab9f6de00db2c",   
  measurementId: "G-M81ZDN0JPT"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export default app;
export const auth = getAuth(app);
export const loginUser = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const signupUser = (email, password) => createUserWithEmailAndPassword(auth, email, password);


//const analytics = getAnalytics(app);