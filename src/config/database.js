import ENV from "./env.js";
import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(ENV.MONGO_URI)
        // console.log(`😊 Connected to MongoDB: ${mongoose.connection.host}`);
        return mongoose.connection;

    } catch(error) {
        console.log("Database connection error", error.message)
    }
}

export default connectDB;