import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function AuthForm({ isRegister = false, onSuccess }) {
    const { login, register } = useAuth();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [phonenumber, setPhonenumber] = useState('');
    const [DateOfBirth, setDateOfBirth] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault(); // prevent form submit => no redirect here
        setLoading(true)
        setError('')

        try {
            if (isRegister) {
                // For register, use password as confirmPassword if not provided
                const ok = await register(email, password, confirmPassword || password, DateOfBirth);
                if (!ok) {
                    setError('Registration failed')
                } else {
                    if (onSuccess) onSuccess()
                }
            } else {
                const ok = await login(email, password);
                if (!ok) {
                    setError('Email or Password invalid')
                } else {
                    if (onSuccess) onSuccess()
                }
            }
        } catch (err) {
            setError(err.message || (isRegister ? 'Registration failed' : 'Login failed'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label htmlFor="username">User Name:</label>
                <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="phonenumber">Phone Number:</label>
                <input
                    id="phonenumber"
                    type="text"
                    required
                    value={phonenumber}
                    onChange={(e) => setPhonenumber(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="DateOfBirth">Date of Birth:</label>
                <input
                    id="DateOfBirth"
                    type="date"
                    value={DateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                />
            </div>
            <div>
                <label htmlFor="pwd">Password</label>
                <input
                    id='pwd'
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
            </div>
            {isRegister && (
                <div>
                    <label htmlFor="confirmPwd">Confirm Password</label>
                    <input
                        id='confirmPwd'
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                </div>
            )}
            {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
            <button type="submit" disabled={loading}>{isRegister ? "Register" : "Login"}</button>
        </form>
    );
}