const logger = (req, res, next) => {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} - ${duration}ms`);
    });

    next();
};

module.exports = logger;
