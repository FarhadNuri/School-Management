import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model.js';
import ENV from '../config/env.js';

export const protectUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Not authorized. No token provided.' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Not authorized. No token provided.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, ENV.JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized. Invalid or expired token' });
        }

        const user = await UserModel.findById(decoded.id);
        if (!user || user.isDeleted) {
            return res.status(401).json({ message: 'Not authorized. User not found.' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'Account is banned. Contact the school administration.' });
        }

        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
};