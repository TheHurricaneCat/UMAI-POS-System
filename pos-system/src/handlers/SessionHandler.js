import { v4 as uuidv4 } from 'uuid';

import { supabase } from '../database/supabase.js';
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
    inventory_id: null, // Set default value for inventory_id
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
        inventory_id: sessionDetails.inventory_id,
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
  const sessionDetailsString = localStorage.getItem('sessionDetails');
  if (sessionDetailsString) {
    try {
      const sessionDetails = JSON.parse(sessionDetailsString);
      
      // Handle backward compatibility - migrate old session format
      if (!sessionDetails.hasOwnProperty('inventory_id')) {
        console.log("[SESSION] Migrating old session format to include inventory_id");
        sessionDetails.inventory_id = null; // Set default value
        localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
      }
      
      sessionToken = sessionDetails.token;
      console.log("[SESSION]  Active session found:", sessionDetails);
      return true;
    } catch (error) {
      console.error("[SESSION] Error parsing session details, clearing corrupted data:", error);
      localStorage.removeItem('sessionDetails');
      return false;
    }
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
        employee_id: data.employee_id, // Fixed: was 'employeeId'
        inventory_id: data.inventory_id || null, // Handle null inventory_id from database
        start_time: data.start_time, // Fixed: was 'startTime'
        end_time: data.end_time, // Fixed: was 'endTime'
        clock_out_time: data.clock_out_time,
      };

      localStorage.setItem('sessionDetails', JSON.stringify(sessionDetails));
      console.log('[SUPABASE] Active session found:', sessionDetails);
      return true;
      } else {
        console.log('[SUPABASE] No active session found for employee:', employeeId);
        return false;
      }
  } catch (error) {
    console.error('[SUPABASE] Error in checkActiveSession:', error);
    return false;
  }
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
    
    // Handle backward compatibility - ensure inventory_id exists
    if (!parsedDetails.hasOwnProperty('inventory_id')) {
      console.log("[SESSION] Adding missing inventory_id to session details");
      parsedDetails.inventory_id = null;
      localStorage.setItem('sessionDetails', JSON.stringify(parsedDetails));
    }
    
    console.log("[SESSION]  Parsed session details:", parsedDetails);
    return parsedDetails;
  } catch (error) {
    console.error("[SESSION]  Error parsing session details:", error);
    // Clear corrupted session data
    localStorage.removeItem('sessionDetails');
    return null;
  }
}

export async function uploadSessionDetails() {
  const sessionDetails = getSessionDetails();
  if (!sessionDetails) {
    console.error("[SESSION]  No session details found to save");
    return false;
  }

  try {
    // Prepare update object with backward compatibility
    const updateData = {
      end_time: sessionDetails.end_time,
      clock_out_time: sessionDetails.clock_out_time,
    };
    
    // Only include inventory_id if it exists and is not null
    if (sessionDetails.inventory_id !== null && sessionDetails.inventory_id !== undefined) {
      updateData.inventory_id = sessionDetails.inventory_id;
    }

    const { data, error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_SESSION_TABLE)
      .update(updateData)
      .eq('token', sessionDetails.token)
      .select()
      .single();

    if (error) {
      console.error('[SUPABASE] Error saving session details:', error);
      return false;
    }

    console.log('[SUPABASE] Session details saved successfully:', data);
    return true;
  } catch (error) {
    console.error('[SUPABASE] Exception during session details save:', error);
    return false;
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
  
  if (!sessionDetails) {
    console.error("[SESSION] No session details found");
    return false;
  }
  
  if (sessionDetails.clock_out_time === null) {
      console.error("[SESSION] Cannot end session without clocking out first");
      return -2;
  }
  
  try {
    if (!navigator.onLine) {
      console.error("[SESSION] No internet connection available");
      return false;
    }

    // Prepare update object with backward compatibility
    const updateData = {
      end_time: new Date().toISOString(),
      clock_out_time: sessionDetails.clock_out_time
    };
    
    // Only include inventory_id if it exists and is not null
    if (sessionDetails.inventory_id !== null && sessionDetails.inventory_id !== undefined) {
      updateData.inventory_id = sessionDetails.inventory_id;
    }

    const { data, error } = await supabase
      .from(import.meta.env.VITE_SUPABASE_SESSION_TABLE)
      .update(updateData)
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
      const ingredients = data.filter(item => item.type === 'ingredient');
      
      if (specificType === "product") {
        return [products, [], []];
      } else if (specificType === "modifier") {
        return [[], modifiers, []];
      } else if (specificType === "ingredient") {
        return [[], [], ingredients];
      }

      // save fallback 
      localStorage.setItem('products', JSON.stringify(products));
      localStorage.setItem('modifiers', JSON.stringify(modifiers));
      localStorage.setItem('ingredients', JSON.stringify(ingredients));
      console.log("[SESSION] Successfully fetched product catalog and saved to local storage");
      
      return [products, modifiers, ingredients];
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
    uploadSessionDetails,
  };
}