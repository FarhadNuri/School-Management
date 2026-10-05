import express from "express";
import cors from "cors"
import ENV from "./config/env.js";
import connectDB from "./config/database.js";
import {notFound, errorHandler} from "./middleware/error.middleware.js"
import userRoutes from "./routes/user.route.js"
import adminRoutes from "./routes/admin.route.js"
import teacherRoutes from "./routes/teacher.route.js"
import seedAdmin from "./config/seedAmin.js";

const app = express()

app.use(cors({
    origin:[ENV.FRONTEND_URL, ENV.ADMIN_URL],
    credentials: true
}))

app.use(express.json())

app.use('/api/health',(req, res) => {
    res.status(200).json({
        message: "API is Running",
        version: "1.0.0",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        status: "OK"
    })
})


app.use('/api/admin',adminRoutes)
app.use('/api/user',userRoutes)
app.use('/api/teacher',teacherRoutes)




app.use(notFound)
app.use(errorHandler)

const startDB = async () => {
    try {
        const conn = await connectDB()
        if(conn.readyState === 1) {
            console.log("😊 Database Connected Successfully")
            await seedAdmin()
            app.listen(ENV.PORT, () => {
                console.log(`😊 Server Running On Port ${ENV.PORT}`)
            })
        } else {
            console.log("😭 Database Connection Failed")
        }
        
        return conn;
    } catch(error) {
        console.log("Fail To Start The Server")
        process.exit(1)
    }
}

startDB()