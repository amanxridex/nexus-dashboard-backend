// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
    console.error(`[Error] ${err.message}`);
    console.error(err.stack);

    // Default to 500 server error
    const statusCode = err.statusCode || 500;
    
    // Create a generic response message for production, keep stack trace in dev if preferred
    const response = {
        error: true,
        message: statusCode === 500 ? 'Internal Server Error' : err.message,
    };

    // In a real production setup, we might only expose err.message for 4xx errors
    // and hide err.message for 500 errors to prevent leaking sensitive information.
    
    res.status(statusCode).json(response);
};

module.exports = errorHandler;
