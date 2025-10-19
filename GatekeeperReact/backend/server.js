import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs-extra";

const app = express();
app.use(cors());
app.use(bodyParser.json());

const USERS_FILE = "./users.json";

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    const users = await fs.readJson(USERS_FILE);

    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: "User already exists!" });
    }

    users.push({ username, password });
    await fs.writeJson(USERS_FILE, users, { spaces: 2 });

    res.json({ message: "Signup successful!" });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const users = await fs.readJson(USERS_FILE);

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
    }

    res.json({ message: "Login successful!" });
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Gatekeeper running on port ${PORT}`));
