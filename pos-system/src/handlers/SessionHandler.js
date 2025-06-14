
import { v4 as uuidv4 } from 'uuid';

import supabase from '../database/supabase.js';
import { decode } from 'base64-arraybuffer'

let sessionToken = null;

export async function startSession(employee_id) {
  console.log("[SESSION]  Starting session for employee:", employee_id);
  const isActive = await checkActiveSession(employee_id);
  if (isActive) {
    console.log("[SESSION]  An active session already exists for this employee.");
    return false;
  }
  
  const token = uuidv4();
  const sessionDetails = {
    token,
    employee_id,
    start_time: new Date().toISOString(),
    end_time: null,
    clock_out_time: null,
  };
  localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
  sessionToken = token;
  console.log("[SESSION]  Session started:", sessionDetails);

  try {
    const { data, error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_SESSION_TABLE)
      .insert({ 
        token: sessionToken, 
        employee_id: employee_id, 
        start_time: sessionDetails.start_time, 
        end_time: null 
      })
      .select()
      .single();
    
      if (error) {
      console.error('[SUPABASE] Error inserting session:', error);
      return false;
    }
    console.log('[SUPABASE] Session created successfully:', data);
  } catch (error) {
    console.log('[SUPABASE] Exception during session creation:', error);
  }

  //deprecated
  /* 
    const collectionsRef = collection(firestore, 'Sessions');
    try {
    const docRef = await addDoc(collectionsRef, sessionDetails);
    console.log("Session details saved to Firestore with ID:", docRef.id);
    // Update the document with the generated ID
    await updateDoc(docRef, { documentID: docRef.id });
    console.log("Document updated with ID:", docRef.id);
  } catch (error) {
    console.error("Error saving session details to Firestore:", error);
  } */

  // I assume these functions updates stock levels

/*   const productsRef = collection(firestore, 'Products');
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
  } */

  return true;
}

export async function getUsername(employeeId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', employeeId)
      .maybeSingle();
    
    if (error) {
      console.error('[SUPABASE] Error finding username:', error);
      return false;
    }

    if (!data) {
      console.log('[SUPABASE] No active session found for employee:', employeeId);
      return false;
    }

    console.log('[SUPABASE] Found username:', data.name);
    return data.name
  } catch (error) {
    console.log('[SUPABASE] Exception during username search:', error);
  }
}

export async function checkActiveSession(employeeId) {
  // check local storage
  const sessionDetails = JSON.parse(localStorage.getItem('sessionDetails'));
  if (sessionDetails) {
    sessionToken = sessionDetails.token;
    console.log("[SESSION]  Active session found:", sessionDetails);
    return true;
  }
  // attempt supabase check
  try {
    console.log("[SESSION]  Attempting to check for active session in Supabase...");
    const { data, error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_SESSION_TABLE)
      .select('*')
      .eq('employee_id', employeeId)
      .is('end_time', null)
      .maybeSingle();

      if (error) {
        console.error('[SUPABASE] Error in checkActiveSession:', error);
        return false;
      }

      if (data) {

      const sessionDetails = {
        token: data.token,
        employeeId: data.employee_id,
        startTime: data.start_time,
        endTime: data.end_time,
        clock_out_time: data.clock_out_time,
      };

      localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
      console.log('[SUPABASE] Active session found:', sessionDetails);
      return true;
      } else {
        console.log('[SUPABASE] No active session found for employee:', employeeId);
        return false;
      }

      return true;
  } catch (error) {
    console.error('[SUPABASE] Error in checkActiveSession:', error);

    return false;
  }


  /* const collectionsRef = collection(firestore, 'Sessions');
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
  return false; */
}

export function getSessionDetails() {
  const sessionDetails = localStorage.getItem('sessionDetails');
  
  if (!sessionDetails) {
    console.log("[SESSION]  No session details found in localStorage");
    return null;
  }
  
  console.log("[SESSION]  Raw session details from localStorage:", sessionDetails);

  try {
    const parsedDetails = JSON.parse(sessionDetails);
    console.log("[SESSION]  Parsed session details:", parsedDetails);
    return parsedDetails;
  } catch (error) {
    console.error("[SESSION]  Error parsing session details:", error);
    return null;
  }
}

export async function clockOut(employeeId) {
  const sessionDetails = getSessionDetails();
  console.log("[SESSION]  Clocking out for employee:", employeeId);
  if (sessionDetails) {
    sessionDetails.clock_out_time = new Date().toISOString();
    localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
    return true;
  } else {
    console.error("[SESSION]  No active session/employee found to clock out");
    return false;
  }
}

export async function logOut() {
  try {
      const { error } = await supabase.auth.signOut();
      localStorage.removeItem('sessionDetails');
      if (error) {
          throw error;
      }
      return true;
    } catch (error) {
        console.error("[SUPABASE] Error logging out: ", error);
        return false;
    }
}

export async function endSession(employeeId) {
  const sessionDetails = getSessionDetails();
  console.log("[SESSION]  Ending session for employee:", employeeId);
  
  if (sessionDetails.clock_out_time === null) {
      console.error("[SESSION] Cannot end session without clocking out first");
      return -2;
  }
  
  if (sessionDetails) {
    try {
      
      if (!navigator.onLine) {
        console.error("[SESSION] No internet connection available");
        return false;
      }

      const { data, error } = await supabase
        .from(import.meta.env.VITE_SUPABASE_SESSION_TABLE)
        .update({end_time: new Date().toISOString(), clock_out_time: sessionDetails.clock_out_time})
        .is('end_time', null)
        .eq('employee_id', employeeId);
        

      if (error) {
        console.error('[SUPABASE] Error ending session:', error);
        return false;
      } else {
        console.log('[SUPABASE] Session ended successfully:', data);
      }
      localStorage.removeItem('session_' + sessionDetails.token);
      localStorage.removeItem('sessionDetails');
      sessionToken = null;
      console.log("[SESSION]  Session ended:", sessionDetails);
    } catch (error) {
      console.error('[SUPABASE] Error ending session:', error);
      return false;
    }
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
          throw error;
      }
      
    } catch (error) {
        console.error("[SUPABASE] Error logging out: ", error);
        return false;
    }
    
    return true;
  }
    // deprecated
/*     try {
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
  } */
}

/////////////////////// DATABASE STORAGE FUNCTIONS /////////////////////////

export async function saveExcelFile() {
  try {
    // Get session details
    const sessionDetails = getSessionDetails();
    if (!sessionDetails || !sessionDetails.token) {
      console.error("[STORAGE] No active session found");
      return false;
    }

    // Get Excel data from localStorage
    const sessionID = `session_${sessionDetails.token}`;
    const base64Data = localStorage.getItem(sessionID);
    
    if (!base64Data) {
      console.error("[STORAGE] No Excel data found in localStorage");
      return -1;
    }
    
    // Get the base64 content after the comma
    const base64Content = base64Data.split(',')[1];
    if (!base64Content) {
      console.error("[STORAGE] Invalid base64 data format");
      return false;
    }
    
    // Convert base64 to ArrayBuffer using the library you already imported
    const fileData = decode(base64Content);
    
    // Upload to Supabase with a clear filename
    const fileName = `${sessionID}.xlsx`;
    console.log("[STORAGE] Uploading file:", fileName);

    if (!navigator.onLine) {
      console.error("[STORAGE] No internet connection available");
      return false;
    }
    
    const { data, error } = await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_EXCEL_STORAGE_BUCKET)
      .upload(fileName, fileData, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true // Overwrite if exists
      });
    
    if (error) {
      console.error("[STORAGE] Upload error:", error);
      return false;
    }
    
    console.log("[STORAGE] File uploaded successfully:", data);
    return true;
    
  } catch (error) {
    console.error("[STORAGE] Exception during file upload:", error);
    return false;
  }
}

export async function downloadExcelFile(token) {
  const storageRef = ref(storage, `session_${token}.xlsx`);
  try {
    const url = await getDownloadURL(storageRef);
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      localStorage.setItem(`session_${token}`, reader.result);
      console.log("Excel file downloaded and saved to local storage");
    };
  } catch (error) {
    console.error("Error downloading Excel file from Firebase Storage:", error);
  }
}

export async function fetchProductCatalog(specificType) {
  try {
    console.log("[SESSION] Attempting to fetch products", specificType ? `of type: ${specificType}` : "");
    const { data, error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_PRODUCT_TABLE)
      .select('*');

    if (error) {
      console.error('[SUPABASE] Error when fetching products:', error);
      return false; // Return empty arrays instead of false
    }

    console.log("[SESSION] Data fetched from Supabase:", data);

    if (data && data.length > 0) {
      
      const products = data.filter(item => item.type === 'product' || !item.type);
      const modifiers = data.filter(item => item.type === 'modifier');
      
      if (specificType === "product") {
        return [products, []];
      } else if (specificType === "modifier") {
        return [[], modifiers];
      }

      // save fallback 
      localStorage.setItem('products', JSON.stringify(products));
      localStorage.setItem('modifiers', JSON.stringify(modifiers));
      console.log("[SESSION] Successfully fetched product catalog and saved to local storage");
      
      return [products, modifiers];
    } else {
      console.log('[SUPABASE] No product data found');
      return false; // Return empty arrays for consistency
    }
  } catch (error) {
    console.error('[SUPABASE] Error in fetchProductCatalog:', error);
    return false; // Return empty arrays for consistency
  }
}

export function useSessionHandler() {
  const [token, setToken] = useState(sessionToken);

  return {
    startSession,
    getSessionDetails,
    endSession,
    getUsername,
    clockOut,
    sessionToken: token,
  };
}