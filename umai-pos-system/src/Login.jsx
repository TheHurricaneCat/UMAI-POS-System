import React, {useState} from "react";
import './Login.css'

import person_icon from './account-components/person.png'
import email_icon from './account-components/email.png'
import password_icon from './account-components/password.png'
import { loginUser, signupUser } from "../firebase";
import {signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const Login = () => {

    const [action, setAction] = useState("Login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async () => {
        try {
            if (action === "Login") {
                await loginUser(email, password);
                alert("Login Successful!");
            } else {
                await signupUser(email, password);
                alert("Account Created Successfully!");
            }
        } catch (error) {
            setErrorMessage(error.message);
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
                    <div className="input">
                        <img src={person_icon} alt="User" />
                        <input 
                            type="text" 
                            placeholder="Name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                        />
                    </div>
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
                <button className="submit-btn" onClick={handleSubmit}>
                    submit
                </button>
            </div>
        </div>
    )
};


export default Login