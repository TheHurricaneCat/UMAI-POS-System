import React, { useEffect, useState } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import './AccountPage.css';

const AccountPage = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const db = getFirestore();

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
                setLoading(false);
            }
        };

        fetchSessions();
    }, [db]);

    return (
        <div className="account-page">
            <h1>Employee Sessions</h1>
            {loading ? (
                <p>Loading sessions...</p>
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