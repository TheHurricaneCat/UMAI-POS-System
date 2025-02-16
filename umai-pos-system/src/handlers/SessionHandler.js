import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function useSessionHandler() {
  const [sessionToken, setSessionToken] = useState(null);

  const startSession = (employeeId) => {
    const token = uuidv4();
    const sessionDetails = {
      token,
      employeeId,
      excelFileName: `session_${token}.xlsx`,
      startTime: new Date().toISOString(),
    };
    localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
    setSessionToken(token);
    console.log("Session started:", sessionDetails);
  };

  const getSessionDetails = () => {
    const sessionDetails = JSON.parse(localStorage.getItem('sessionDetails'));
    return sessionDetails;
  };

  const endSession = async () => {
    const sessionDetails = getSessionDetails();
    if (sessionDetails) {
      // Send session details to Firebase Firestore
      await saveSessionToFirestore(sessionDetails);
      localStorage.removeItem('sessionDetails');
      setSessionToken(null);
      console.log("Session ended:", sessionDetails);
    }
  };

  const saveSessionToFirestore = async (sessionDetails) => {
    // Initialize Firebase Firestore
    const { getFirestore, doc, setDoc } = require('firebase/firestore');
    const { app } = require('../firebase'); // Adjust the path to your firebase.js file
    const db = getFirestore(app);

    try {
      await setDoc(doc(db, 'sessions', sessionDetails.token), sessionDetails);
      console.log("Session details saved to Firestore");
    } catch (error) {
      console.error("Error saving session details to Firestore:", error);
    }
  };

  return {
    startSession,
    getSessionDetails,
    endSession,
    sessionToken,
  };
}