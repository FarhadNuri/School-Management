import cloudinary from "cloudinary"
import ENV from "./env.js"

cloudinary.config({
    CLOUDINARY_CLOUD_NAME : ENV.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY : ENV.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET : ENV.CLOUDINARY_API_SECRET
})

export default cloudinary;