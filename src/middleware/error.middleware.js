import ENV from "../config/env.js";

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404)
    next(error)
}

const errorHandler = (error, req, res, next) => {
    const statusCode = error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode)
    res.status(statusCode)
    res.json({
        message: error.message,
        stack: ENV.NODE_ENV === "production" ? null : error.stack
    })
}

export {notFound, errorHandler}