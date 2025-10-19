import React, { useState } from "react";
import Signup from "./components/Signup";
import Login from "./components/Login";

function App() {
    const [view, setView] = useState("signup");

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>Code Academy Gatekeeper</h1>
            <button onClick={() => setView("signup")}>Signup</button>
            <button onClick={() => setView("login")}>Login</button>
            <hr />
            {view === "signup" ? <Signup /> : <Login />}
        </div>
    );
}

export default App;
