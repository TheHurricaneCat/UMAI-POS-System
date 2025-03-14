import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
/* import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from '../firebase'; // Adjust the path to your firebase.js file */

import { firestore, storage } from '/firebase.js'
import { collection, query, where, getDocs, addDoc, updateDoc, setDoc, doc } from '@firebase/firestore';
import { ref, uploadString, getDownloadURL } from '@firebase/storage';

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

export async function getSessionDetails() {
  // attempt local check
  const sessionDetails = JSON.parse(localStorage.getItem('sessionDetails'));
  console.log("Active Session Found in localStorage:", sessionDetails);
  if (sessionDetails) {
    return sessionDetails;
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

export async function downloadExcelFile(token) {
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