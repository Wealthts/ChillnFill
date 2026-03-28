require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const apiRoutes = require('./routes/api');

const app = express();
const port = Number(process.env.PORT || 3000);
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5500';

app.use(cors({
  origin: clientOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Restaurant System Node API is running',
    api_base: `http://localhost:${port}/api/`
  });
});

app.use('/api', apiRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(port, () => {
  console.log(`Restaurant API listening on http://localhost:${port}`);
});
