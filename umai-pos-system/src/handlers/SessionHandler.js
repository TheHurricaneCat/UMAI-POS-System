import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
/* import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '../firebase'; // Adjust the path to your firebase.js file */

import { firestore, storage } from '/firebase.js'
import { collection, query, where, getDocs, addDoc, updateDoc, setDoc, doc } from '@firebase/firestore';
import { ref, uploadString, getDownloadURL } from '@firebase/storage';
import { products, modifiers, ingredients } from './product.js';

let sessionToken = null;


export async function startSession(employeeId) {
  console.log("Starting session for employee:", employeeId);
  const isActive = await checkActiveSession(employeeId);
  if (isActive) {
    console.log("An active session already exists for this employee.");
    return false;
  }
  
  const token = uuidv4();
  const sessionDetails = {
    token,
    employeeId,
    excelFileName: `session_${token}.xlsx`,
    startTime: new Date().toISOString(),
    endTime: null,
  };
  localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
  sessionToken = token;
  console.log("Session started:", sessionDetails);

  const collectionsRef = collection(firestore, 'Sessions');

  try {
    const docRef = await addDoc(collectionsRef, sessionDetails);
    console.log("Session details saved to Firestore with ID:", docRef.id);
    // Update the document with the generated ID
    await updateDoc(docRef, { documentID: docRef.id });
    console.log("Document updated with ID:", docRef.id);
  } catch (error) {
    console.error("Error saving session details to Firestore:", error);
  }

  const productsRef = collection(firestore, 'Products');
  for (const product of products) {
    try {
      const productDoc = await addDoc(productsRef, {
        sessionToken: token,
        name: product.name,
        code: product.code,
        price: product.price,
        category: product.category,
        stockNumber: product.stockNumber
      });
      console.log(`Added product ${product.name} with ID: ${productDoc.id}`);
    } catch (error) {
      console.error(`Error adding product ${product.name}:`, error);
    }
  }

  const modifiersRef = collection(firestore, 'Modifiers');
  const sauceModifiers = modifiers.filter(mod => mod.category === "Sauce");

  for (const modifier of sauceModifiers) {
    try {
      const modifierDoc = await addDoc(modifiersRef, {
        sessionToken: token,
        name: modifier.name,
        code: modifier.code,
        price: modifier.price,
        category: modifier.category,
        stockNumber: modifier.stockNumber
      });
      console.log(`Added modifier ${modifier.name} with ID: ${modifierDoc.id}`);
    } catch (error) {
      console.error(`Error adding modifier ${modifier.name}:`, error);
    }
  }

  const ingredientsRef = collection(firestore, 'Ingredients');
  for (const ingredient of ingredients) {
    try {
      const ingredientDoc = await addDoc(ingredientsRef, {
        sessionToken: token,
        name: ingredient.name,
        code: ingredient.code,
        price: ingredient.price,
        category: ingredient.category,
        stockNumber: ingredient.stockNumber
      });
      console.log(`Added ingredient ${ingredient.name} with ID: ${ingredientDoc.id}`);
    } catch (error) {
      console.error(`Error adding ingredient ${ingredient.name}:`, error);
    }
  }

  return true;
}

export async function checkActiveSession(employeeId) {
  // check local storage
  const sessionDetails = JSON.parse(localStorage.getItem('sessionDetails'));
  if (sessionDetails) {
    sessionToken = sessionDetails.token;
    console.log("Active session found:", sessionDetails);
    return true;
  }
  // attempt firebase check
  const collectionsRef = collection(firestore, 'Sessions');
  const q = query(collectionsRef, where('employeeId', '==', employeeId), where('endTime', '==', null));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    const sessionDetails = querySnapshot.docs[0].data();
    sessionToken = sessionDetails.token;
    localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
    console.log("Active session found in Firebase:", sessionDetails);
    
    //Upload to local storage
    localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));

    //Ensures that the client session has the latest version of the excel file
    const base64Data = localStorage.getItem(sessionDetails.token);
    if (!base64Data) {
      console.log("No Excel file data found in local storage, downloading from Firebase Storage...");
      await downloadExcelFile(sessionDetails.token);
    }

    return true;
  }

  console.log("No active session found");
  return false;
}

export function getSessionDetails() {
  const sessionDetails = localStorage.getItem('sessionDetails');
  console.log("Raw session details from localStorage:", sessionDetails);
  
  if (!sessionDetails) {
    console.log("No session details found in localStorage");
    return null;
  }

  try {
    const parsedDetails = JSON.parse(sessionDetails);
    console.log("Parsed session details:", parsedDetails);
    return parsedDetails;
  } catch (error) {
    console.error("Error parsing session details:", error);
    return null;
  }
}

export async function endSession(employeeId) {
  const sessionDetails = getSessionDetails();
  if (sessionDetails) {
    try {
      const collectionsRef = collection(firestore, 'Sessions');
      const q = query(collectionsRef, where('employeeId', '==', employeeId), where('endTime', '==', null));
      const querySnapshot = await getDocs(q);
    
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0].ref;
        const endTime = new Date().toISOString();
        await updateDoc(docRef, { endTime });
        console.log("Session ended with endTime:", endTime);
      }
    } catch (error) {
      console.error("Error updating session endTime in Firestore:", error);
    }

    localStorage.removeItem('sessionDetails');
    sessionToken = null;
    console.log("Session ended:", sessionDetails);
  }
}

/////////////////////// FIREBASE STORAGE FUNCTIONS /////////////////////// //

export async function saveExcelFile() {
  const sessionDetails = await getSessionDetails();
  if (!sessionDetails) {
    console.error("No active session found");
    return;
  }
  const base64Data = localStorage.getItem(sessionDetails.token);
  
  if (!base64Data) {
    console.error("No Excel file data found in local storage");
    return;
  }

  const storageRef = ref(storage, `${sessionDetails.token}.xlsx`);
  try {
    await uploadString(storageRef, base64Data, 'data_url');
    console.log("Excel file saved to Firebase Storage");
  } catch (error) {
    console.error("Error saving Excel file to Firebase Storage:", error);
  }
}

async function downloadExcelFile(token) {
  const storageRef = ref(storage, `${token}.xlsx`);
  try {
    const url = await getDownloadURL(storageRef);
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      localStorage.setItem(token, reader.result);
      console.log("Excel file downloaded and saved to local storage");
    };
  } catch (error) {
    console.error("Error downloading Excel file from Firebase Storage:", error);
  }
}

export function useSessionHandler() {
  const [token, setToken] = useState(sessionToken);

  return {
    startSession,
    getSessionDetails,
    endSession,
    sessionToken: token,
  };
}