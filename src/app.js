const express = require('express');
const cors = require('cors');

// Import Middlewares
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// 1. Basic Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Request Logging Middleware
app.use(logger);

// 3. Application Routes
const routes = require('./routes/index');
app.use('/api', routes);

// Status route for health checking
app.get('/status', (req, res) => {
  res.json({ status: 'ok', message: 'Nexus Company Dashboard Backend is Live' });
});

// 4. Global 404 Route handler
app.use((req, res, next) => {
    res.status(404).json({ error: true, message: 'API Endpoint Not Found' });
});

// 5. Global Error Handling Middleware (Must be last)
app.use(errorHandler);

module.exports = app;
