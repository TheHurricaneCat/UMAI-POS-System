import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import './BackupManager.css';
import PopUp from './global-components/Popup.jsx';
import { createBackup, listBackups, listExcelBackups, downloadBackup, restoreBackup, deleteBackup, backupAllExcelFiles, RESTORE_KEY_PHRASE, isOnline } from './handlers/BackupHandler';

const BackupManager = () => {
    const navigate = useNavigate();
    
    // Backup management state
    const [backups, setBackups] = useState([]);
    const [excelBackups, setExcelBackups] = useState([]);
    const [loadingBackups, setLoadingBackups] = useState(false);
    const [loadingExcelBackups, setLoadingExcelBackups] = useState(false);
    const [selectedTable, setSelectedTable] = useState('products');
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [selectedBackup, setSelectedBackup] = useState(null);
    const [backingUpExcel, setBackingUpExcel] = useState(false);
    
    // Popup states
    const [showBackupSuccess, setShowBackupSuccess] = useState(false);
    const [showBackupError, setShowBackupError] = useState(false);
    const [showRestorePrompt, setShowRestorePrompt] = useState(false);
    const [showRestoreSuccess, setShowRestoreSuccess] = useState(false);
    const [showRestoreError, setShowRestoreError] = useState(false);
    const [showDeletePrompt, setShowDeletePrompt] = useState(false);
    const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
    const [showDeleteError, setShowDeleteError] = useState(false);
    const [showOfflineError, setShowOfflineError] = useState(false);
    const [showExcelBackupSuccess, setShowExcelBackupSuccess] = useState(false);
    const [showExcelBackupError, setShowExcelBackupError] = useState(false);
    
    const [popupMessage, setPopupMessage] = useState('');
    const [confirmAction, setConfirmAction] = useState(false);

    // Tables available for backup
    const availableTables = [
        { name: 'products', label: 'Products' },
        { name: 'profiles', label: 'User Profiles' },
        { name: 'sessions', label: 'Sessions' }
    ];

    useEffect(() => {
        fetchBackups();
        fetchExcelBackups();
    }, []);

    // Effect to handle confirmation for restore
    useEffect(() => {
        const handleRestoreConfirmation = async () => {
            if (confirmAction && selectedBackup) {
                // Reset confirmation state
                setConfirmAction(false);
                
                // Execute the restore operation
                try {
                    const restoreResult = await restoreBackup(
                        selectedBackup.fileName, 
                        confirmPhrase
                    );
                    
                    if (restoreResult.success) {
                        setPopupMessage(`Backup restored successfully: ${restoreResult.message}`);
                        setShowRestoreSuccess(true);
                    } else {
                        setPopupMessage(`Failed to restore backup: ${restoreResult.message}`);
                        setShowRestoreError(true);
                    }
                } catch (error) {
                    setPopupMessage(`Error during restoration: ${error.message}`);
                    setShowRestoreError(true);
                }
                
                // Reset state
                setSelectedBackup(null);
                setConfirmPhrase('');
            }
        };
        
        handleRestoreConfirmation();
    }, [confirmAction]);

    const fetchBackups = async () => {
        if (!isOnline()) {
            setPopupMessage("Cannot access backups while offline");
            setShowOfflineError(true);
            return;
        }
        
        setLoadingBackups(true);
        
        try {
            const result = await listBackups();
            if (result.success) {
                setBackups(result.data);
            } else {
                console.error("Error listing backups:", result.error);
            }
        } catch (error) {
            console.error("Error fetching backups:", error);
        } finally {
            setLoadingBackups(false);
        }
    };

    const fetchExcelBackups = async () => {
        if (!isOnline()) {
            return; // Silently fail, we already show offline message from fetchBackups
        }
        
        setLoadingExcelBackups(true);
        
        try {
            const result = await listExcelBackups();
            if (result.success) {
                setExcelBackups(result.data);
            } else {
                console.error("Error listing Excel backups:", result.error);
            }
        } catch (error) {
            console.error("Error fetching Excel backups:", error);
        } finally {
            setLoadingExcelBackups(false);
        }
    };

    const handleCreateBackup = async () => {
        if (!isOnline()) {
            setPopupMessage("Cannot create backups while offline");
            setShowOfflineError(true);
            return;
        }
        
        try {
            const result = await createBackup(selectedTable);
            
            if (result.success) {
                setPopupMessage(`Backup of ${selectedTable} created successfully at ${new Date(result.timestamp).toLocaleString()}`);
                setShowBackupSuccess(true);
                // Refresh backup list
                fetchBackups();
            } else {
                setPopupMessage(`Failed to create backup: ${result.error}`);
                setShowBackupError(true);
            }
        } catch (error) {
            setPopupMessage(`Error creating backup: ${error.message}`);
            setShowBackupError(true);
        }
    };

    const handleBackupAllExcel = async () => {
        if (!isOnline()) {
            setPopupMessage("Cannot back up Excel files while offline");
            setShowOfflineError(true);
            return;
        }
        
        setBackingUpExcel(true);
        
        try {
            const result = await backupAllExcelFiles();
            
            if (result.success) {
                setPopupMessage(`Excel backup created successfully: ${result.message}`);
                setShowExcelBackupSuccess(true);
                fetchBackups(); // Refresh backup list to show the new Excel backup
            } else {
                setPopupMessage(`Failed to create Excel backup: ${result.error}`);
                setShowExcelBackupError(true);
            }
        } catch (error) {
            setPopupMessage(`Error backing up Excel files: ${error.message}`);
            setShowExcelBackupError(true);
        } finally {
            setBackingUpExcel(false);
        }
    };

    const handleBackupDownload = async (fileName, type) => {
        if (!isOnline()) {
            setPopupMessage("Cannot download backups while offline");
            setShowOfflineError(true);
            return;
        }
        
        await downloadBackup(fileName, type);
    };

    const promptRestore = (backup) => {
        setSelectedBackup(backup);
        setShowRestorePrompt(true);
    };

    const promptDelete = (backup) => {
        setSelectedBackup(backup);
        setShowDeletePrompt(true);
    };

    const handleDeleteBackup = async () => {
        if (!selectedBackup) return;
        
        try {
            const result = await deleteBackup(selectedBackup.fileName, selectedBackup.type);
            
            if (result.success) {
                setPopupMessage(`Backup deleted successfully`);
                setShowDeleteSuccess(true);
                fetchBackups();
                fetchExcelBackups();
            } else {
                setPopupMessage(`Failed to delete backup: ${result.error}`);
                setShowDeleteError(true);
            }
            
            setSelectedBackup(null);
        } catch (error) {
            setPopupMessage(`Error deleting backup: ${error.message}`);
            setShowDeleteError(true);
            setSelectedBackup(null);
        }
    };

    const handleRedirect = (path) => {
        navigate(path);
    };

    // Format dates specifically for the table display
    const formatTableDate = (dateString) => {
        if (!dateString) return 'Unknown date';
        
        try {
            // Parse the timestamp that looks like "2025:06:23T14:24:04:322Z"
            let formattedDate;
            
            // Check if it's in the unusual format with colons instead of hyphens
            if (typeof dateString === 'string' && dateString.includes(':')) {
                // Replace colons in the date part with hyphens for proper parsing
                const correctedDateString = dateString
                    .replace(/(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
                    .replace(/:\d{3}Z$/, 'Z'); // Fix milliseconds format
                
                formattedDate = new Date(correctedDateString);
            } else {
                formattedDate = new Date(dateString);
            }
            
            // Check if the date is valid
            if (isNaN(formattedDate.getTime())) {
                return dateString; // Return original string if parsing failed
            }
            
            // Format the date in a clear, readable way
            return formattedDate.toLocaleString(undefined, {
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            });
        } catch (error) {
            console.error("Error formatting table date:", error, dateString);
            return dateString; // Return original string on error
        }
    };

    return (
        <div className="account-page">
            <div className="navigation-bar">
                <button className="redirect-btn" onClick={() => handleRedirect('/app')}>Go to App</button>
                <button className="redirect-btn" onClick={() => handleRedirect('/session-viewer')}>Session Viewer</button>
            </div>
            
            <div className="page-title">
                <div className="icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V17M12 7V13M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#17a2b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <h1>Database Backup Management</h1>
            </div>
            
            {isOnline() ? (
                <>
                    <div className="backup-section">
                        <h2>Table Backup</h2>
                        <p className="backup-description">
                            Create backups of individual tables. Select a table and click the button to create a backup.
                        </p>
                        <div className="backup-actions">
                            <select 
                                value={selectedTable} 
                                onChange={(e) => setSelectedTable(e.target.value)}
                                className="table-select"
                            >
                                {availableTables.map(table => (
                                    <option key={table.name} value={table.name}>{table.label}</option>
                                ))}
                            </select>
                            <button className="backup-btn" onClick={handleCreateBackup}>Create Table Backup</button>
                            <button className="refresh-btn" onClick={fetchBackups}>Refresh Backups</button>
                        </div>

                        <h3>Available Table Backups</h3>
                        {loadingBackups ? (
                            <p>Loading backups...</p>
                        ) : backups.length === 0 ? (
                            <p>No table backups found. Create your first backup using the form above.</p>
                        ) : (
                            <table className="sessions-table">
                                <thead>
                                    <tr>
                                        <th>Table</th>
                                        <th>Date</th>
                                        <th>File Size</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map((backup, index) => (
                                        <tr key={`table-${index}`}>
                                            <td>{backup.tableName}</td>
                                            <td>{formatTableDate(backup.timestamp)}</td>
                                            <td>{(backup.size / 1024).toFixed(2)} KB</td>
                                            <td className="backup-actions-cell">
                                                <button 
                                                    className="download-btn" 
                                                    onClick={() => handleBackupDownload(backup.fileName)}
                                                >
                                                    Download
                                                </button>
                                                <button 
                                                    className="restore-btn" 
                                                    onClick={() => promptRestore(backup)}
                                                >
                                                    Restore
                                                </button>
                                                <button 
                                                    className="delete-btn" 
                                                    onClick={() => promptDelete(backup)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="backup-section">
                        <h2>Excel File Backup</h2>
                        <p className="backup-description">
                            Create backups of all Excel files from active sessions. This helps preserve transaction history.
                        </p>
                        <div className="backup-actions">
                            <button 
                                className="excel-backup-btn" 
                                onClick={handleBackupAllExcel}
                                disabled={backingUpExcel}
                            >
                                {backingUpExcel ? 'Backing Up Excel Files...' : 'Backup All Excel Files'}
                            </button>
                            <button className="refresh-btn" onClick={fetchExcelBackups}>Refresh Excel Backups</button>
                        </div>

                        <h3>Available Excel Files</h3>
                        {loadingExcelBackups ? (
                            <p>Loading Excel files...</p>
                        ) : excelBackups.length === 0 ? (
                            <p>No Excel files found in storage.</p>
                        ) : (
                            <table className="sessions-table">
                                <thead>
                                    <tr>
                                        <th>Session ID</th>
                                        <th>File Size</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {excelBackups.map((backup, index) => (
                                        <tr key={`excel-${index}`}>
                                            <td>{backup.sessionToken}</td>
                                            <td>{(backup.size / 1024).toFixed(2)} KB</td>
                                            <td className="backup-actions-cell">
                                                <button 
                                                    className="download-btn" 
                                                    onClick={() => handleBackupDownload(backup.fileName, 'excel')}
                                                >
                                                    Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </>
            ) : (
                <div className="offline-message">
                    <p>You are currently offline. Backup management requires an internet connection.</p>
                    <button className="refresh-btn" onClick={fetchBackups}>Check Connection</button>
                </div>
            )}

            {/* All Popup Components */}
            
            {/* Backup Success Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showBackupSuccess}
                setTrigger={setShowBackupSuccess}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Backup Error Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showBackupError}
                setTrigger={setShowBackupError}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Excel Backup Success Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showExcelBackupSuccess}
                setTrigger={setShowExcelBackupSuccess}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Excel Backup Error Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showExcelBackupError}
                setTrigger={setShowExcelBackupError}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Restore Confirmation Popup */}
            <div className={`restore-modal ${showRestorePrompt ? 'show' : ''}`}>
                {showRestorePrompt && selectedBackup && (
                    <div className="restore-modal-content" onClick={e => e.stopPropagation()}>
                        <h2>Confirm Restore</h2>
                        <p>You are about to restore data from backup:</p>
                        <p><strong>{selectedBackup.tableName} Table</strong> from {formatTableDate(selectedBackup.timestamp)}</p>
                        
                        <p className="warning">
                            This will REPLACE ALL current data in the {selectedBackup.tableName} table. This action cannot be undone.
                        </p>
                        
                        <div className="confirm-phrase-container">
                            <p>To confirm, type: <strong>{RESTORE_KEY_PHRASE}</strong></p>
                            <input 
                                type="text" 
                                value={confirmPhrase} 
                                onChange={(e) => setConfirmPhrase(e.target.value)}
                                placeholder="Type confirmation phrase"
                                className="confirm-input"
                            />
                        </div>
                        
                        <div className="button-group">
                            <button 
                                className="confirm-btn"
                                disabled={confirmPhrase !== RESTORE_KEY_PHRASE}
                                onClick={() => {
                                    setShowRestorePrompt(false);
                                    setConfirmAction(true);
                                }}
                            >
                                Confirm Restore
                            </button>
                            <button 
                                className="cancel-btn"
                                onClick={() => {
                                    setShowRestorePrompt(false);
                                    setSelectedBackup(null);
                                    setConfirmPhrase('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Restore Success Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showRestoreSuccess}
                setTrigger={setShowRestoreSuccess}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Restore Error Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showRestoreError}
                setTrigger={setShowRestoreError}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Delete Confirmation Popup */}
            <PopUp 
                text={`Are you sure you want to delete the backup of ${selectedBackup?.tableName} from ${selectedBackup ? formatTableDate(selectedBackup.timestamp) : ''}?`}
                button1="Delete"
                button2="Cancel"
                trigger={showDeletePrompt}
                setTrigger={setShowDeletePrompt}
                confirm={false}
                setConfirm={() => {
                    if (showDeletePrompt) {
                        handleDeleteBackup();
                    }
                }}
            />
            
            {/* Delete Success Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showDeleteSuccess}
                setTrigger={setShowDeleteSuccess}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Delete Error Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showDeleteError}
                setTrigger={setShowDeleteError}
                confirm={false}
                setConfirm={() => {}}
            />
            
            {/* Offline Error Popup */}
            <PopUp 
                text={popupMessage}
                button1="OK"
                button2="Close"
                trigger={showOfflineError}
                setTrigger={setShowOfflineError}
                confirm={false}
                setConfirm={() => {}}
            />
        </div>
    );
};
export default BackupManager;
