import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import supabase from './database/supabase';
import './SessionViewer.css';

const SessionViewer = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                // Fetch sessions from Supabase
                const { data, error } = await supabase
                    .from(import.meta.env.VITE_SUPABASE_SESSION_TABLE)
                    .select('*')
                    .order('start_time', { ascending: false });

                if (error) {
                    throw error;
                }

                setSessions(data || []);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching sessions: ", error);
                setError("Failed to load sessions. Please try again later.");
                setLoading(false);
            }
        };

        fetchSessions();
    }, []);

    const handleRedirect = () => {
        navigate('/app');
    };

    const handleDownload = async (fileName) => {
        try {
            // Get the file from storage bucket
            const { data, error } = await supabase.storage
                .from(import.meta.env.VITE_SUPABASE_EXCEL_STORAGE_BUCKET)
                .download(fileName);
                
            if (error) {
                console.error("[SUPABASE] Error downloading file:", error);
                throw error;
            }
            
            // Create a URL for the file and trigger download
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error downloading file:", error);
            alert("Failed to download file. Please try again.");
        }
    };

    return (
        <div className="account-page">
            <h1>Employee Sessions</h1>
            <button className="redirect-btn" onClick={handleRedirect}>Go to App</button>
            {loading ? (
                <p>Loading sessions...</p>
            ) : error ? (
                <p className="error-message">{error}</p>
            ) : (
                <table className="sessions-table">
                    <thead>
                        <tr>
                            <th>Employee ID</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Excel File Name</th>
                            <th>Download</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((session, index) => (
                            <tr key={index}>
                                <td>{session.employee_id}</td>
                                <td>{new Date(session.start_time).toLocaleString()}</td>
                                <td>{session.end_time ? new Date(session.end_time).toLocaleString() : 'Active'}</td>
                                <td>{'session_' + session.token || 'N/A'}</td>
                                <td>
                                    {'session_' + session.token ? (
                                        <button 
                                            className="download-btn" 
                                            onClick={() => handleDownload(`session_${session.token}.xlsx`)}
                                        >
                                            Download
                                        </button>
                                    ) : (
                                        'No file'
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default SessionViewer;