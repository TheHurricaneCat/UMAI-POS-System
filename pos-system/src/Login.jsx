import React, { useState, useContext } from "react";
import './Login.css';
import { useNavigate } from 'react-router-dom';
import { supabase } from './database/supabase';
import { UserContext } from './UserContext';
import { startSession } from './handlers/SessionHandler';

// Import icons
import person_icon from './account-components/person.png';
import email_icon from './account-components/email.png';
import password_icon from './account-components/password.png';

const Login = () => {
    const [action, setAction] = useState("Login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("user");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const {userRole, setUserRole, setSessionId } = useContext(UserContext);

    const handleSubmit = async () => {
        // Input validation
        if (!email || !password) {
            setErrorMessage("Email and password are required");
            return;
        }

        if (action === "Sign Up" && !name) {
            setErrorMessage("Name is required for signup");
            return;
        }

        setLoading(true);
        setErrorMessage("");

        try {
            if (action === "Login") {
                // Sign in with Supabase
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                // Get user profile from the database
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    console.error("Error fetching user profile:", profileError);
                    throw new Error("Could not fetch user profile");
                }

                console.log("[ACCOUNT]  User profile data:", profileData);

                // Set user role in context
                const role = profileData.role || 'employee';
                setUserRole(role);

                console.log("[ACCOUNT]  User role:", userRole);

                // Start a session
                //await startSession(data.user.id);
                // flag variable to indicate login status
                localStorage.setItem('justLoggedIn', 'true');

                // Redirect based on role
                setTimeout(() => {
                    // Redirect based on role
                    if (role === "admin") {
                        navigate('/session-viewer');
                    } else {
                        navigate('/app');
                    }
                }, 100);

                // Clear form
                setEmail("");
                setPassword("");
                
                // set global session ID 
                setSessionId(data.user.id);
            } else {
                // Sign up with Supabase
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name,
                            role: "user" // Default role for new users
                        }
                    }
                });

                if (error) throw error; else console.log("Sign up data:", data);

                // Create a profile entry
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert({
                        id: data.user.id,
                        name: name,
                        role: "user", // Default role for new users
                        email: email
                    })
                    .select()
                    .single();
                
                if (profileError) {
                    console.error("Error creating profile:", profileError);
                    throw new Error("Could not create user profile");
                }

                alert("Account created successfully! Please verify your email before logging in.");
                
                // Reset form and switch to login
                setEmail("");
                setPassword("");
                setName("");
                setRole("user");
                setAction("Login");
            }
        } catch (error) {
            console.error("Authentication error:", error);
            
            // Display user-friendly error message
            if (error.message.includes("Invalid login")) {
                setErrorMessage("Invalid email or password");
            } else if (error.message.includes("already registered")) {
                setErrorMessage("This email is already registered");
            } else {
                setErrorMessage(error.message || "An error occurred during authentication");
            }
        } finally {
            setLoading(false);
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
                    Forgot Password? <span onClick={() => navigate('/reset-password')}>Click Here!</span>
                </div>
            )}

            {errorMessage && <div className="error-message"> <p> {errorMessage} </p> </div>}

            <div className="submit-container" style={{ marginTop: "2vh" }}>
                <div 
                    className={`submit ${action === "Login" ? "gray" : ""}`} 
                    onClick={() => {
                        setAction("Sign Up");
                        setErrorMessage("");
                    }}
                >
                    Sign Up
                </div>
                <div 
                    className={`submit ${action === "Sign Up" ? "gray" : ""}`} 
                    onClick={() => {
                        setAction("Login");
                        setErrorMessage("");
                    }}
                >
                    Login
                </div>
            </div>
            <div className="submit-container">
                <button 
                    className="submit-btn" 
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? "Processing..." : "Submit"}
                </button>
            </div>
        </div>
    );
};

export default Login;