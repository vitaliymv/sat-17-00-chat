const fs = require("fs");
const path = require("path");
const http = require("http");
const db = require("./database")

let validateAuthToken = [];

const indexHtmlFile = fs.readFileSync(path.join(__dirname, "static", "index.html"));
const styleCSSFile = fs.readFileSync(path.join(__dirname, "static", "style.css"));
const scriptJSFile = fs.readFileSync(path.join(__dirname, "static", "script.js"));
const authJSFile = fs.readFileSync(path.join(__dirname, "static", "auth.js"));
const registerHtmlFile = fs.readFileSync(path.join(__dirname, "static", "register.html"));
const loginHtmlFile = fs.readFileSync(path.join(__dirname, "static", "login.html"));
const server = http.createServer((req, res) => {
    if (req.method == "GET") {
        switch (req.url) {
            case "/style.css": return res.end(styleCSSFile);
            case "/register": return res.end(registerHtmlFile);
            case "/login": return res.end(loginHtmlFile);
            case "/auth.js": return res.end(authJSFile);
            default: return guarded(req, res);
        }
    } 

    if (req.method == "POST") {
        switch (req.url) {
            case "/api/register": return registerUser(req, res);
            case "/api/login": return loginUser(req, res);
            default: return guarded(req, res);
        }
    }
    res.statusCode == 404;
    return res.end("Error 404");
})

server.listen(3000);

const { Server } = require("socket.io");
const io = new Server(server);

io.use((socket, next) => {
    const cookie = socket.handshake.auth.cookie;
    const credentials = getCredentials(cookie);

    if (!credentials) {
        next(new Error("no auth"));
    }
    socket.credentials = credentials;
    next();
})

io.on("connection", async (socket) => {
    console.log("a user connected. Id: " + socket.id);
    let nickname = socket.credentials?.username;
    let userId = socket.credentials?.user_id;

    let messages = await db.getMessages();
    socket.emit("all_messages", messages);

    socket.on("new_message", (message) => {
        db.addMessage(userId, message);
        io.emit("message", nickname + ": " + message);
    })
})

function registerUser(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        data += chunk;
    })
    req.on("end", async () => {
        try {
            const user = JSON.parse(data);
            if (!user.login || !user.password) {
                return res.end("Empty login or pasword");
            }
            if (await db.isUserExist(user.login)) {
                return res.end("User already exist");
            }
            await db.addUser(user);
            return res.end("Register is successful")
        } catch (error) {
            console.log(error);
        }
    })
}

function loginUser(req, res) {
    let data = "";
    req.on("data", (chunk) => {
        data += chunk;
    })
    req.on("end", async () => {
        try {
            const user = JSON.parse(data);
            const token = await db.getAuthToken(user);
            validateAuthToken.push(token);
            res.writeHead(200);
            res.end(token);
        } catch (error) {
            res.writeHead(403);
            res.end(error);
        }
    })
}
const cookie = require("cookie");
function getCredentials(c = '') {
    const cookies = cookie.parse(c);
    const token = cookies?.token;

    if (!token || !validateAuthToken.includes(token)) return null;

    const [user_id, login] = token.split(".");
    if (!user_id || !login) return null;

    return {user_id: user_id, username: login};
}

function guarded(req, res) {
    const credentials = getCredentials(req.headers?.cookie);
    if (!credentials) {
        res.writeHead(302, { "Location": "/register" })
    }
    if (req.method == "GET") {
        switch (req.url) {
            case "/": return res.end(indexHtmlFile);
            case "/script.js": return res.end(scriptJSFile);
        }
    }
    res.statusCode == 404;
    return res.end("Error 404");
}