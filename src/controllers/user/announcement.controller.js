import mongoose from 'mongoose';
import AnnouncementModel from '../../models/announcement.model.js';
import { assertValidObjectId } from '../../utils/lessonAccess.js';

const CATEGORIES = ['general', 'academic', 'disciplinary', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];
const TARGET_AUDIENCES = ['all', 'students', 'teachers', 'guardians', 'other'];

const audienceMap = {
    student: ['all', 'students'],
    teacher: ['all', 'teachers'],
    guardian: ['all', 'guardians'],
};

/**
 * Checks whether an announcement is accessible to the user based on role and target audience.
 */
const canAccessAnnouncement = (announcement, user) => {
    if (!announcement || !user) return false;
    if (user.role === 'admin') return true;

    const allowedAudiences = audienceMap[user.role] || ['all'];
    const audiences = announcement.targetAudience || [];

    // If no specific audience is set, it defaults to visible to all
    if (!audiences.length) return true;

    return audiences.some((audience) =>
        allowedAudiences.includes(String(audience).toLowerCase())
    );
};

/**
 * Serializes an announcement document into a clean API response.
 */
const serializeAnnouncement = (announcement) => {
    if (!announcement) return null;
    const plain = typeof announcement.toObject === 'function' ? announcement.toObject() : { ...announcement };

    return {
        id: String(plain._id),
        _id: plain._id,
        title: plain.title || '',
        description: plain.description || '',
        category: plain.category || [],
        severity: plain.severity || [],
        targetAudience: plain.targetAudience || [],
        createdAt: plain.createdAt || null,
        updatedAt: plain.updatedAt || null,
    };
};

/**
 * GET /announcements
 * Lists announcements visible to the current user (filtered by user role and target audience).
 * Supports search, category, and severity filtering.
 */
export const getMyAnnouncements = async (req, res, next) => {
    try {
        const { search, category, severity, page, limit } = req.query;
        const filter = {};

        // Restrict to user's permitted target audience
        if (req.user?.role !== 'admin') {
            const allowedAudiences = audienceMap[req.user?.role] || ['all'];
            filter.targetAudience = { $in: allowedAudiences };
        }

        if (category) {
            const cat = String(category).toLowerCase().trim();
            if (CATEGORIES.includes(cat)) {
                filter.category = cat;
            }
        }

        if (severity) {
            const sev = String(severity).toLowerCase().trim();
            if (SEVERITIES.includes(sev)) {
                filter.severity = sev;
            }
        }

        if (search?.trim()) {
            const term = search.trim();
            const regex = new RegExp(
                term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
                'i'
            );
            filter.$or = [{ title: regex }, { description: regex }];
        }

        let query = AnnouncementModel.find(filter).sort({ createdAt: -1 });

        if (limit && Number(limit) > 0) {
            const pageNum = Math.max(1, Number(page) || 1);
            const limitNum = Number(limit);
            query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
        }

        const announcements = await query.lean();
        const serialized = announcements.map(serializeAnnouncement);

        res.json({
            count: serialized.length,
            announcements: serialized,
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

/**
 * GET /announcements/:id
 * Fetches a single announcement by ID if accessible to the user.
 */
export const getMyAnnouncementById = async (req, res, next) => {
    try {
        const { id } = req.params;
        assertValidObjectId(id, 'announcement ID');

        const announcement = await AnnouncementModel.findById(id).lean();

        if (!announcement || !canAccessAnnouncement(announcement, req.user)) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.json({
            announcement: serializeAnnouncement(announcement),
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        next(error);
    }
};

export {
    canAccessAnnouncement,
    serializeAnnouncement,
    CATEGORIES,
    SEVERITIES,
    TARGET_AUDIENCES,
};
