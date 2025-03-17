import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';
import { logoutUser } from "../firebase";
import './AccountPage.css';

const AccountPage = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const db = getFirestore();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const sessionsCollection = collection(db, "Sessions");
                const sessionSnapshot = await getDocs(sessionsCollection);
                const sessionList = sessionSnapshot.docs.map(doc => doc.data());
                setSessions(sessionList);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching sessions: ", error);
                setError("Failed to load sessions. Please try again later.");
                setLoading(false);
            }
        };

        fetchSessions();
    }, [db]);

    const handleRedirect = () => {
        navigate('/app');
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            navigate('/login');
        } catch (error) {
            console.error("Error logging out: ", error);
        }
    };

    return (
        <div className="account-page">
            <h1>Employee Sessions</h1>
            <button className="redirect-btn" onClick={handleRedirect}>Go to App</button>
            <button className="logout-btn" onClick={handleLogout}>Logout</button>
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
                            <th>Token</th>
                            <th>Download</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sessions.map((session, index) => (
                            <tr key={index}>
                                <td>{session.employeeId}</td>
                                <td>{new Date(session.startTime).toLocaleString()}</td>
                                <td>{new Date(session.endTime).toLocaleString()}</td>
                                <td>{session.excelFileName}</td>
                                <td>{session.token}</td>
                                <td>
                                    <a href={session.excelFileName} download>
                                        <button className="download-btn">Download</button>
                                    </a>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AccountPage;