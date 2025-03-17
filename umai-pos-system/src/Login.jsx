import React, { useState } from "react";
import './Login.css';

import person_icon from './account-components/person.png';
import email_icon from './account-components/email.png';
import password_icon from './account-components/password.png';
import { loginUser, signupUser } from "../firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [action, setAction] = useState("Login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("employee");
    const [errorMessage, setErrorMessage] = useState("");

    const db = getFirestore();
    const navigate = useNavigate();

    const handleSubmit = async () => {
        try {
            if (action === "Login") {
                const user = await loginUser(email, password);
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const userData = userDoc.data();
                if (userData.role === "admin") {
                    alert("Admin Login Successful!");
                    navigate('/account');
                } else {
                    alert("Employee Login Successful!");
                    navigate('/app');
                }
                setEmail("");
                setPassword("");
                setName("");
                setErrorMessage("");
            } else {
                await signupUser(email, password, name, role); 
                alert("Account Created Successfully!");
                setEmail("");
                setPassword("");
                setName("");
                setRole("employee");
                setErrorMessage("");
            }
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                setErrorMessage("The email address is already in use by another account.");
            } else {
                setErrorMessage(error.message);
            }
        }
    };

    return (
        <div className="container">
            <div className="header">
                <div className="text">{action}</div>
                <div className="underline"></div>
            </div>
        
            <div className="inputs">
                {action === "Sign Up" && (
                    <>
                        <div className="input">
                            <img src={person_icon} alt="User" />
                            <input 
                                type="text" 
                                placeholder="Name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                            />
                        </div>
                        <div className="input">
                            <label className="role-label">Role:</label>
                            <select className="role-select" value={role} onChange={(e) => setRole(e.target.value)}>
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </>
                )}

                <div className="input">
                    <img src={email_icon} alt="Email" />
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                    />
                </div>

                <div className="input">
                    <img src={password_icon} alt="Password" />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                    />
                </div>
            </div>

            {action === "Login" && (
                <div className="forgot-password">
                    Forgot Password? <span>Click Here!</span>
                </div>
            )}

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <div className="submit-container">
                <div 
                    className={`submit ${action === "Login" ? "gray" : ""}`} 
                    onClick={() => setAction("Sign Up")}
                >
                    Sign Up
                </div>
                <div 
                    className={`submit ${action === "Sign Up" ? "gray" : ""}`} 
                    onClick={() => setAction("Login")}
                >
                    Login
                </div>
            </div>
            <div className="submit-container">
                <button className="submit-btn" onClick={handleSubmit}>
                    Submit
                </button>
            </div>
        </div>
    )
};

export default Login;