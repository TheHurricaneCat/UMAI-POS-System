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
import pos_logo from './account-components/POS Logo.png';

const Login = () => {
    const [action, setAction] = useState("Login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("user");
    const [errorMessage, setErrorMessage] = useState("");
    const [verificationMessage, setVerificationMessage] = useState("");
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
        setVerificationMessage("");

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

                setVerificationMessage("Account created! Please check your email to verify your account before logging in.");
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

    const handleForgotPassword = async () => {
        if (!email) {
            setErrorMessage("Please enter your email to reset your password.");
            return;
        }
        setLoading(true);
        setErrorMessage("");
        try {
            // Check if email exists in profiles table
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('email')
                .eq('email', email)
                .single();
            if (profileError || !profiles) {
                setErrorMessage("No account found with this email.");
                setLoading(false);
                return;
            }
            // Email exists, try to send reset
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) {
                if (error.message && error.message.toLowerCase().includes("invalid")) {
                    setErrorMessage("This account cannot reset password. Please contact admin.");
                } else {
                    setErrorMessage(error.message || "Failed to send password reset email.");
                }
                setLoading(false);
                return;
            }
            setErrorMessage("Password reset email sent! Please check your inbox.");
        } catch (error) {
            setErrorMessage(error.message || "Failed to send password reset email.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-outer-container">
            <div className="login-card">
                <div className="login-logo-container">
                    <img src={pos_logo} alt="POS Logo" className="login-logo" />
                </div>
                {verificationMessage && (
                    <div className="verification-message">{verificationMessage}</div>
                )}
                <form
                    className="login-form"
                    onSubmit={e => {
                        e.preventDefault();
                        handleSubmit();
                    }}
                    autoComplete="on"
                >
                    {action === "Sign Up" && (
                        <div className="login-input">
                            <img src={person_icon} alt="User" />
                            <input
                                type="text"
                                placeholder="Username"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoComplete="username"
                            />
                        </div>
                    )}
                    <div className="login-input">
                        <img src={email_icon} alt="Email" />
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                        />
                    </div>
                    <div className="login-input">
                        <img src={password_icon} alt="Password" />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            autoComplete={action === "Login" ? "current-password" : "new-password"}
                        />
                    </div>
                    {action === "Sign Up" && (
                        <div className="login-switch-text">
                            Have an account?{' '}
                            <span className="login-link" onClick={() => { setAction("Login"); setErrorMessage(""); }}>Sign In</span>
                        </div>
                    )}
                    {action === "Login" && (
                        <>
                            <div className="forgot-password">
                                Forgot password?{' '}
                                <span className="login-link" onClick={handleForgotPassword}>Click here</span>
                            </div>
                            <div className="login-switch-text">
                                Don&apos;t have an account?{' '}
                                <span className="login-link" onClick={() => { setAction("Sign Up"); setErrorMessage(""); }}>Sign Up</span>
                            </div>
                        </>
                    )}
                    {errorMessage && <div className="error-message">{errorMessage}</div>}
                    <button
                        type="submit"
                        className="login-submit-btn"
                        disabled={loading}
                    >
                        {loading ? (action === "Login" ? "Logging in..." : "Signing up...") : action}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;