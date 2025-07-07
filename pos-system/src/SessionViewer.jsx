import React, { useEffect, useState, useContext } from "react";
import { useNavigate } from 'react-router-dom';
import { supabase } from './database/supabase';
import './SessionViewer.css';
import PopUp from './global-components/PopUp.jsx';
import downloadIcon from './account-components/Download.png';
import deleteIcon from './account-components/Delete.png';
import TopBar from './TopBar.jsx';

const EmployeeTable = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Popup state for deletion
    const [deletePopup, setDeletePopup] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    // Popup state for role change
    const [rolePopup, setRolePopup] = useState(false);
    const [roleConfirm, setRoleConfirm] = useState(false);
    const [roleChangeInfo, setRoleChangeInfo] = useState({ id: null, newRole: "" });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from(import.meta.env.VITE_SUPABASE_PROFILE_TABLE).select("*");
        console.log("Fetched users:", data, error);
        if (!error) setUsers(data);
        setLoading(false);
    };

    // Handle role change popup trigger
    const handleRoleChangePopup = (id, newRole) => {
        setRoleChangeInfo({ id, newRole });
        setRolePopup(true);
    };

    // Confirmed role change
    useEffect(() => {
        const updateRole = async () => {
            if (roleConfirm && roleChangeInfo.id) {
                await supabase.from(import.meta.env.VITE_SUPABASE_PROFILE_TABLE)
                    .update({ role: roleChangeInfo.newRole })
                    .eq("id", roleChangeInfo.id);
                fetchUsers();
            }
            setRoleConfirm(false);
        };
        updateRole();
        // eslint-disable-next-line
    }, [roleConfirm]);

    // Handle delete popup trigger
    const handleDeletePopup = (id) => {
        setUserToDelete(id);
        setDeletePopup(true);
    };

    // Confirmed delete
    useEffect(() => {
        const deleteUser = async () => {
            if (deleteConfirm && userToDelete) {
                const { error } = await supabase.from(import.meta.env.VITE_SUPABASE_PROFILE_TABLE).delete().eq("id", userToDelete);
                if (error) {
                    alert("Failed to delete user.");
                }
                fetchUsers();
            }
            setDeleteConfirm(false);
        };
        deleteUser();
        // eslint-disable-next-line
    }, [deleteConfirm]);

    if (loading) return <div>Loading users...</div>;

    return (
        <div style={{ marginTop: "40px" }}>
            <h1 className="table-title">User Management</h1>
            <table className="sessions-table">
                <thead>
                    <tr>
                        <th>username</th>
                        <th>employee ID</th>
                        <th>role</th>
                        <th>change role</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.id}</td>
                            <td>{user.role}</td>
                            <td>
                                <select
                                    value={user.role}
                                    className="role-select"
                                    onChange={e => handleRoleChangePopup(user.id, e.target.value)}
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                    <option value="employee">Employee</option>
                                </select>
                            </td>
                            <td>
                                <button className="icon-btn" onClick={() => handleDeletePopup(user.id)}>
                                    <img src={deleteIcon} alt="Delete" style={{width:24, height:24}} />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Delete confirmation popup */}
            <PopUp
                text="Are you sure you want to delete this user?"
                button1="Delete"
                button2="Cancel"
                trigger={deletePopup}
                setTrigger={setDeletePopup}
                confirm={deleteConfirm}
                setConfirm={setDeleteConfirm}
            />
            {/* Role change confirmation popup */}
            <PopUp
                text={`Are you sure you want to change this user's role to "${roleChangeInfo.newRole}"?`}
                button1="Change"
                button2="Cancel"
                trigger={rolePopup}
                setTrigger={setRolePopup}
                confirm={roleConfirm}
                setConfirm={setRoleConfirm}
            />
        </div>
    );
};

const SessionViewer = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('user');
    const [currentUser, setCurrentUser] = useState(null);
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

        const fetchCurrentUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Optionally fetch profile info
                const { data: profile } = await supabase
                  .from(import.meta.env.VITE_SUPABASE_PROFILE_TABLE)
                  .select('*')
                  .eq('id', user.id)
                  .single();
                setCurrentUser(profile || user);
            }
        };

        fetchSessions();
        fetchCurrentUser();
    }, []);

    const handleRedirect = (path) => {
        navigate(path);
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
            <TopBar user={currentUser} />
            <div className="main-content">
                <div className="admin-tabs-centered">
                    <div className="admin-tabs">
                        <button className={`admin-tab${activeTab==='user'?' active':''}`} onClick={()=>setActiveTab('user')}>user management</button>
                        <button className={`admin-tab${activeTab==='session'?' active':''}`} onClick={()=>setActiveTab('session')}>employee session</button>
                    </div>
                </div>
                {activeTab === 'user' ? (
                    <EmployeeTable />
                ) : (
                    <div>
                        <h1 className="table-title">Employee Session</h1>
                        <table className="sessions-table">
                            <thead>
                                <tr>
                                    <th>employee ID</th>
                                    <th>start time</th>
                                    <th>end time</th>
                                    <th>excel file name</th>
                                    <th>download</th>
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
                                                <button className="icon-btn" onClick={() => handleDownload(`session_${session.token}.xlsx`)}>
                                                    <img src={downloadIcon} alt="Download" style={{width:24, height:24}} />
                                                </button>
                                            ) : (
                                                'No file'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SessionViewer;