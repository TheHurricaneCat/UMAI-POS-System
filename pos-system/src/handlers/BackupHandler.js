import { supabase } from '../database/supabase';

// Confirmation key phrase for restoration
export const RESTORE_KEY_PHRASE = "CONFIRM DATABASE RESTORE";

/**
 * Checks if the system is online
 * @returns {boolean} Whether the system has internet connectivity
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Creates a backup of the specified table
 * @param {string} tableName - The name of the table to back up
 * @returns {Promise<{success: boolean, data: any, error: any, timestamp: string}>}
 */
export async function createBackup(tableName) {
  if (!isOnline()) {
    console.error("[BACKUP] Cannot create backup while offline");
    return { success: false, error: "No internet connection", data: null, timestamp: null };
  }

  try {
    // First, check if the user is authenticated
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session?.user) {
      console.error("[BACKUP] User is not authenticated");
      return { success: false, error: "Authentication required for creating backups", data: null, timestamp: null };
    }

    // Get all data from the specified table
    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      console.error(`[BACKUP] Error fetching ${tableName} for backup:`, error);
      return { success: false, error: error.message, data: null, timestamp: null };
    }

    if (!data || data.length === 0) {
      console.warn(`[BACKUP] No data found in ${tableName} for backup`);
      return { success: false, error: `No data found in ${tableName}`, data: null, timestamp: null };
    }

    const timestamp = new Date().toISOString();
    const backupObject = {
      table: tableName,
      timestamp: timestamp,
      data: data
    };

    // Save backup to Supabase storage
    const fileName = `backup_${tableName}_${timestamp.replace(/[:.]/g, '-')}.json`;
    const fileContent = JSON.stringify(backupObject, null, 2);
    
    // Create backup folder if it doesn't exist (may not be needed based on Supabase setup)
    try {
      await supabase.storage
        .from(import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups')
        .createSignedUrl('/', 60); // This is just to test bucket access
    } catch (folderError) {
      console.warn("[BACKUP] Folder check failed:", folderError);
      // Continue anyway as this might just be an API limitation
    }
    
    // Add debugging for upload parameters
    console.debug("[BACKUP] Uploading to bucket:", import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups');
    console.debug("[BACKUP] File name:", fileName);
    console.debug("[BACKUP] Content size:", fileContent.length);
    
    // Upload with user authentication header
    const { error: uploadError } = await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups')
      .upload(fileName, fileContent, {
        contentType: 'application/json',
        upsert: true // Changed from false to true to overwrite existing files
      });

    if (uploadError) {
      console.error("[BACKUP] Error saving backup:", uploadError);
      return { success: false, error: uploadError.message, data: null, timestamp: null };
    }

    return { 
      success: true, 
      error: null, 
      data: backupObject, 
      timestamp: timestamp,
      fileName: fileName
    };
  } catch (error) {
    console.error("[BACKUP] Exception during backup creation:", error);
    return { success: false, error: error.message, data: null, timestamp: null };
  }
}

/**
 * Lists all backups available in storage
 * @returns {Promise<Array>} List of backup files
 */
export async function listBackups() {
  if (!isOnline()) {
    console.error("[BACKUP] Cannot list backups while offline");
    return { success: false, error: "No internet connection", data: [] };
  }

  try {
    const { data, error } = await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups')
      .list('', {
        sortBy: { column: 'name', order: 'desc' },
      });

    if (error) {
      console.error("[BACKUP] Error listing backups:", error);
      return { success: false, error: error.message, data: [] };
    }

    // Parse backup information from filenames
    const backups = data
      .filter(item => item.name.startsWith('backup_'))
      .map(item => {
        const nameParts = item.name.replace('backup_', '').split('_');
        const tableName = nameParts[0];
        let timestamp = '';
        
        // Try to extract a parsable timestamp from the filename
        try {
          // Join remaining parts and replace hyphens back to colons for time segments
          const timestampPart = nameParts.slice(1).join('_').replace('.json', '');
          
          // Format the timestamp to be valid for Date parsing
          // Example: 2023-06-22T14-05-29-604Z becomes 2023-06-22T14:05:29.604Z
          timestamp = timestampPart
            .replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z')
            .replace(/-/g, ':');
          
          // Validate if it's parseable
          const testDate = new Date(timestamp);
          if (isNaN(testDate.getTime())) {
            console.warn("Could not parse timestamp:", timestamp);
            timestamp = timestampPart; // Keep original if unparseable
          }
        } catch (err) {
          console.warn("Error parsing timestamp:", err);
          // Use the raw name parts as fallback
          timestamp = nameParts.slice(1).join('_').replace('.json', '');
        }
        
        return {
          fileName: item.name,
          tableName: tableName,
          timestamp: timestamp,
          size: item.metadata?.size || 0,
          type: 'json'
        };
      });
      
    // Sort all backups by timestamp (newest first)
    backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return { success: true, error: null, data: backups };
  } catch (error) {
    console.error("[BACKUP] Exception during listing backups:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Lists all Excel file backups available in storage
 * @returns {Promise<Array>} List of Excel backup files
 */
export async function listExcelBackups() {
  if (!isOnline()) {
    console.error("[BACKUP] Cannot list Excel backups while offline");
    return { success: false, error: "No internet connection", data: [] };
  }

  try {
    const { data, error } = await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_EXCEL_STORAGE_BUCKET || 'excel.storage')
      .list('', {
        sortBy: { column: 'name', order: 'desc' },
      });

    if (error) {
      console.error("[BACKUP] Error listing Excel backups:", error);
      return { success: false, error: error.message, data: [] };
    }

    const excelBackups = data
      .filter(item => item.name.endsWith('.xlsx') || item.name.includes('session_'))
      .map(item => {
        // Extract session token from filename (session_TOKEN.xlsx)
        const token = item.name.replace('session_', '').replace('.xlsx', '');
        
        return {
          fileName: item.name,
          sessionToken: token,
          size: item.metadata?.size || 0,
          timestamp: item.metadata?.lastModified || new Date().toISOString(),
          type: 'excel'
        };
      });
      
    return { success: true, error: null, data: excelBackups };
  } catch (error) {
    console.error("[BACKUP] Exception during listing Excel backups:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Downloads a backup file
 * @param {string} fileName - The name of the backup file to download
 * @param {string} type - The type of backup ('json' or 'excel')
 * @returns {Promise<{success: boolean, data: any, error: any}>}
 */
export async function downloadBackup(fileName, type = 'json') {
  if (!isOnline()) {
    console.error("[BACKUP] Cannot download backup while offline");
    return { success: false, error: "No internet connection", data: null };
  }

  try {
    const bucketName = type === 'excel' 
      ? (import.meta.env.VITE_SUPABASE_EXCEL_STORAGE_BUCKET || 'excel.storage') 
      : (import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups');
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(fileName);

    if (error) {
      console.error("[BACKUP] Error downloading backup:", error);
      return { success: false, error: error.message, data: null };
    }

    // Create URL for file download
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, error: null, data: data };
  } catch (error) {
    console.error("[BACKUP] Exception during backup download:", error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Gets a backup file content
 * @param {string} fileName - The name of the backup file to retrieve
 * @returns {Promise<{success: boolean, data: any, error: any}>}
 */
export async function getBackupContent(fileName) {
  if (!isOnline()) {
    console.error("[BACKUP] Cannot retrieve backup content while offline");
    return { success: false, error: "No internet connection", data: null };
  }

  try {
    const { data, error } = await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups')
      .download(fileName);

    if (error) {
      console.error("[BACKUP] Error retrieving backup:", error);
      return { success: false, error: error.message, data: null };
    }

    // Parse JSON content
    const text = await data.text();
    const backupObject = JSON.parse(text);
    return { success: true, error: null, data: backupObject };
  } catch (error) {
    console.error("[BACKUP] Exception during backup retrieval:", error);
    return { success: false, error: error.message, data: null };
  }
}

/**
 * Creates a backup of all Excel files currently in the Excel storage
 * @returns {Promise<{success: boolean, error: string|null, message: string}>}
 */
export async function backupAllExcelFiles() {
  if (!isOnline()) {
    console.error("[BACKUP] Cannot create Excel backup while offline");
    return { success: false, error: "No internet connection", message: "Cannot back up Excel files while offline" };
  }

  try {
    // First, check if the user is authenticated
    const { data: authData } = await supabase.auth.getSession();
    if (!authData?.session?.user) {
      console.error("[BACKUP] User is not authenticated");
      return { success: false, error: "Authentication required for creating backups", message: "Authentication required" };
    }
    
    // Get list of all Excel files in storage
    const { data: excelFiles, error: listError } = await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_EXCEL_STORAGE_BUCKET || 'excel.storage')
      .list();
      
    if (listError) {
      console.error("[BACKUP] Error listing Excel files:", listError);
      return { 
        success: false, 
        error: listError.message, 
        message: "Failed to list Excel files" 
      };
    }
    
    if (!excelFiles || excelFiles.length === 0) {
      return { 
        success: true, 
        error: null, 
        message: "No Excel files found to back up" 
      };
    }
    
    // Create a timestamp for the backup folder
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFolderName = `excel_backup_${timestamp}`;
    
    // Track success and failures
    let successCount = 0;
    const failures = [];
    
    // Copy each Excel file to the backup folder
    for (const file of excelFiles) {
      if (!file.name.endsWith('.xlsx') && !file.name.includes('session_')) continue;
      
      try {
        // First download the file
        const { data, error: downloadError } = await supabase.storage
          .from(import.meta.env.VITE_SUPABASE_EXCEL_STORAGE_BUCKET || 'excel.storage')
          .download(file.name);
          
        if (downloadError) {
          failures.push(`Failed to download ${file.name}: ${downloadError.message}`);
          continue;
        }
        
        // Then upload to the backup bucket with a folder prefix
        const backupPath = `${backupFolderName}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups')
          .upload(backupPath, data, {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            upsert: false
          });
          
        if (uploadError) {
          failures.push(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }
        
        successCount++;
      } catch (error) {
        failures.push(`Error processing ${file.name}: ${error.message}`);
      }
    }
    
    // Create backup summary
    const summary = {
      timestamp,
      totalFiles: excelFiles.length,
      successCount,
      failures
    };
    
    // Save summary as JSON
    const summaryFileName = `excel_backup_summary_${timestamp}.json`;
    await supabase.storage
      .from(import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups')
      .upload(summaryFileName, JSON.stringify(summary, null, 2), {
        contentType: 'application/json',
        upsert: false
      });
      
    return { 
      success: true, 
      error: failures.length > 0 ? "Some files failed to backup" : null, 
      message: `Excel backup complete: ${successCount} files backed up successfully, ${failures.length} failures`,
      details: summary
    };
  } catch (error) {
    console.error("[BACKUP] Exception during Excel backup:", error);
    return { 
      success: false, 
      error: error.message, 
      message: "An error occurred during Excel backup" 
    };
  }
}

/**
 * Restores data from a backup
 * @param {string} fileName - The name of the backup file to restore
 * @param {string} confirmPhrase - The confirmation phrase that must match RESTORE_KEY_PHRASE
 * @returns {Promise<{success: boolean, error: string|null, message: string}>}
 */
export async function restoreBackup(fileName, confirmPhrase) {
  if (!isOnline()) {
    return { success: false, error: "No internet connection", message: "Cannot restore backup while offline" };
  }

  // Verify confirmation phrase
  if (confirmPhrase !== RESTORE_KEY_PHRASE) {
    return { success: false, error: "Invalid confirmation phrase", message: "The confirmation phrase does not match" };
  }

  try {
    // Get the backup content
    const backupResult = await getBackupContent(fileName);
    if (!backupResult.success) {
      return { 
        success: false, 
        error: backupResult.error, 
        message: "Failed to retrieve backup file"
      };
    }

    const backupObject = backupResult.data;
    const tableName = backupObject.table;
    const dataToRestore = backupObject.data;

    // First, remove existing data from the table
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', 'non_existent_id'); // This is a trick to delete all rows

    if (deleteError) {
      console.error(`[BACKUP] Error clearing table ${tableName}:`, deleteError);
      return { 
        success: false, 
        error: deleteError.message, 
        message: `Failed to clear existing data in ${tableName}`
      };
    }

    // Insert the backup data
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(dataToRestore);

    if (insertError) {
      console.error(`[BACKUP] Error restoring data to ${tableName}:`, insertError);
      return { 
        success: false, 
        error: insertError.message, 
        message: `Failed to restore data to ${tableName}`
      };
    }

    return { 
      success: true, 
      error: null, 
      message: `Successfully restored ${dataToRestore.length} records to ${tableName}`
    };
  } catch (error) {
    console.error("[BACKUP] Exception during backup restoration:", error);
    return { 
      success: false, 
      error: error.message, 
      message: "An error occurred during backup restoration" 
    };
  }
}

/**
 * Deletes a backup file
 * @param {string} fileName - The name of the backup file to delete
 * @param {string} type - The type of backup ('json' or 'excel')
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function deleteBackup(fileName, type = 'json') {
  if (!isOnline()) {
    console.error("[BACKUP] Cannot delete backup while offline");
    return { success: false, error: "No internet connection" };
  }

  try {
    const bucketName = type === 'excel' 
      ? (import.meta.env.VITE_SUPABASE_EXCEL_STORAGE_BUCKET || 'excel.storage') 
      : (import.meta.env.VITE_SUPABASE_BACKUP_BUCKET || 'backups');
    
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error("[BACKUP] Error deleting backup:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("[BACKUP] Exception during backup deletion:", error);
    return { success: false, error: error.message };
  }
}