import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCLVKs5SzXiDv5Qp2wSHe_0e9w4jhWmg1A",
  authDomain: "catsup-cloud.firebaseapp.com",
  projectId: "catsup-cloud",
  storageBucket: "catsup-cloud.appspot.com",
  messagingSenderId: "393754765381",
  appId: "1:393754765381:web:62348da02ab9f6de00db2c",
};

const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);
const auth = getAuth(firebaseApp);

// Function for user login
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Function for user signup
export const signupUser = async (email, password, name, role) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(firestore, "users", user.uid), {
      name: name,
      email: email,
      role: role,
    });
    return user;
  } catch (error) {
    throw error;
  }
};

// Function for user logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

export { firebaseApp, firestore, storage, auth };