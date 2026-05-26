const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const mysql = require('mysql2/promise');

dotenv.config();

const app = express();

// Setup EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'rahasia',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Database connection - pakai pool biar auto-reconnect
let db;
async function connectDB() {
    try {
        db = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'railway',
            port: parseInt(process.env.DB_PORT) || 3306,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });
        console.log('✅ Database pool created');
    } catch (err) {
        console.log('❌ Database connection failed:', err.message);
        setTimeout(connectDB, 5000);
    }
}
connectDB();

// Make db available to routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

// ================ ROUTES ================
app.use('/', require('./routes/auth'));
app.use('/tasks', require('./routes/tasks'));
app.use('/notes', require('./routes/notes'));
app.use('/quiz', require('./routes/quiz'));
app.use('/schedule', require('./routes/schedule'));
app.use('/study', require('./routes/study'));
app.use('/export', require('./routes/export'));
app.use('/gamification', require('./routes/gamification'));
app.use('/flashcard', require('./routes/flashcard'));
app.use('/telegram', require('./routes/telegram'));
app.use('/ai-chat', require('./routes/ai-chat'));

// Home redirect
app.get('/', (req, res) => {
    res.redirect('/login');
});

// Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
