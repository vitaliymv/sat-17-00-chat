const dbFile = "./chat.db";
const dbWrapper = require("sqlite");
const fs = require("fs");
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
let db;

dbWrapper.open({
    filename: dbFile,
    driver: sqlite3.Database
}).then(async item => {
    db = item;

    try {
        if (!exists) {
            await db.run(
                `CREATE TABLE user (
                    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    login TEXT,
                    password TEXT
                );`
            );

            await db.run(
                `INSERT INTO user (login, password) VALUES
                ('admin', '123456'),
                ('user', 'qwerty');`
            )   
            
            await db.run(
                `CREATE TABLE message(
                    msg_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT,
                    author_id INTEGER,
                    FOREIGN KEY(author_id) REFERENCES user(id)
                );`
            )
        } else {
            console.log(await db.all("SELECT * FROM user"));
        }
    } catch (error) {
        console.log(error);
    }
})


module.exports = {
    getMessages: async () => {
        try {
            return await db.all(
                `SELECT msg_id, content, user_id, login FROM message
                JOIN user ON message.author_id = user.user_id`
            )
        } catch (error) {
            console.log(error);
        }
    },

    addMessage: async (user_id, msg) => {
        try {
            await db.run(
                `INSERT INTO message (content, author_id) VALUES (?, ?)`,
                [msg, user_id]
            )
        } catch (error) {
            console.log(error);
        }
    },

    isUserExist: async (login) => {
        try {
            const user = await db.all("SELECT * FROM user WHERE login = ?", [login]);
            return user.length;
        } catch (error) {
            console.log(error);
        }
    },

    addUser: async (user) => {
        try {
            await db.run(
                "INSERT INTO user(login, password) VALUES (?, ?)",
                [user.login, user.password]
            )
        } catch (error) {
            console.log(error);
        }
    }
}