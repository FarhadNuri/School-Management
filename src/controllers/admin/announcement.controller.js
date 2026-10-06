import mongoose from "mongoose";
import Announcement from '../../models/announcement.model.js'

const CATEGORIES = ['general', 'academic', 'disciplinary', 'other'];
const SEVERITIES = ['low', 'medium', 'high'];
const TARGET_AUDIENCES = ['all', 'students', 'teachers', 'guardians', 'other'];

const toEnumArray = (value, allowed) => {
    if (value == null || value === '') return [];

    const items = Array.isArray(value) ? value : [value];

    return [
        ...new Set(
            items
                .map((item) => String(item).trim().toLowerCase())
                .filter((item) => allowed.includes(item))
        ),
    ];
};

const addAnnouncement = async (req, res, next) => {
  try {
    const { title, description, category, severity, targetAudience } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const categories = toEnumArray(category, CATEGORIES);
    const severities = toEnumArray(severity, SEVERITIES);
    const audiences = toEnumArray(targetAudience, TARGET_AUDIENCES);

    if (!categories.length) {
      return res.status(400).json({ message: 'Valid category is required' });
    }

    if (!severities.length) {
      return res.status(400).json({ message: 'Valid severity is required' });
    }

    if (!audiences.length) {
      return res.status(400).json({ message: 'Valid target audience is required' });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      description: description?.trim() || '',
      category: categories,
      severity: severities,
      targetAudience: audiences,
    });

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement,
    });
  } catch (error) {
    next(error)
  }
}
const getAnnouncements = async (req, res, next) => {
  try {
    const { search, category, severity, targetAudience } = req.query;
    const filter = {};

    if (category && CATEGORIES.includes(category.toLowerCase())) {
      filter.category = category.toLowerCase();
    }

    if (severity && SEVERITIES.includes(severity.toLowerCase())) {
      filter.severity = severity.toLowerCase();
    }

    if (
      targetAudience &&
      TARGET_AUDIENCES.includes(targetAudience.toLowerCase())
    ) {
      filter.targetAudience = targetAudience.toLowerCase();
    }

    if (search?.trim()) {
      const term = search.trim();
      const regex = new RegExp(
        term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i'
      );

      filter.$or = [{ title: regex }, { description: regex }];
    }

    const announcements = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      count: announcements.length,
      announcements,
    });
  } catch (error) {
    next(error);
  }
};


const getAnnouncementById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findById(id).lean();

    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    res.json({ announcement });
  } catch (error) {
    next(error);
  }
};

const updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findByIdAndUpdate(id, req.body, {
      new: true
    });
    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};
export {addAnnouncement, getAnnouncements, getAnnouncementById, updateAnnouncement}