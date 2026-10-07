import Class from "../../models/class.model.js";
import Student from "../../models/student.model.js";
import Teacher from "../../models/teacher.model.js";
import Guardian from "../../models/guardian.model.js";
import {uploadFiles, deleteFromCloudinaryMany} from '../../middleware/multer.middleware.js'
import ENV from "../../config/env.js";  
import mongoose from "mongoose";
import Complaint from "../../models/complaint.model.js";


const isObjectId = (value) => {
    if (!value) return false;
    const text = String(value).trim();
    return (
        mongoose.Types.ObjectId.isValid(text) &&
        String(new mongoose.Types.ObjectId(text)) === text
    );
};

// Shape a student / teacher / guardian profile into the person object used
// in serialized complaints (id, role, display name, photo).
const toPerson = (profile, role) => {
    if (!profile) return null;

    const user =
        profile.user && typeof profile.user === 'object' ? profile.user : {};
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();

    return {
        id: String(profile._id),
        _id: profile._id,
        role,
        name: name || 'Unknown',
        photo: user.photo || '',
    };
};

// Look up unique person IDs across Student, Teacher, and Guardian, then
// return a Map of id → toPerson() so list/detail can attach reporter info.
const hydratePeopleByIds = async (ids = []) => {
    const unique = [
        ...new Set(
            ids
                .map((id) => String(id || '').trim())
                .filter((id) => isObjectId(id))
        ),
    ];

    const peopleMap = new Map();
    if (!unique.length) return peopleMap;

    const [students, teachers, guardians] = await Promise.all([
        Student.find({ _id: { $in: unique } })
            .populate('user', 'firstName lastName photo role')
            .lean(),
        Teacher.find({ _id: { $in: unique } })
            .populate('user', 'firstName lastName photo role')
            .lean(),
        Guardian.find({ _id: { $in: unique } })
            .populate('user', 'firstName lastName photo role')
            .lean(),
    ]);

    for (const student of students) {
        peopleMap.set(String(student._id), toPerson(student, 'student'));
    }
    for (const teacher of teachers) {
        peopleMap.set(String(teacher._id), toPerson(teacher, 'teacher'));
    }
    for (const guardian of guardians) {
        peopleMap.set(String(guardian._id), toPerson(guardian, 'guardian'));
    }

    return peopleMap;
};

// Resolve a stored person id through the hydrated Map. Falls back to an
// "Unknown" stub if the profile was deleted or not found.
const mapPerson = (id, peopleMap) => {
    if (!id) return null;
    const key = String(id);
    return (
        peopleMap.get(key) || {
            id: key,
            _id: key,
            role: 'unknown',
            name: 'Unknown',
            photo: '',
        }
    );
};

// Gather reporter IDs from a complaint list so hydratePeopleByIds can
// fetch them in one batch for getComplaints / getComplaintById.
const collectPersonIds = (complaints = []) => {
    const ids = [];

    for (const complaint of complaints) {
        if (complaint.reporter) ids.push(complaint.reporter);
    }

    return ids;
};

// Flatten reportedParty / witnesses into a trimmed string for the API.
// Accepts a string, array, or object and caps length so responses stay tidy.
const normalizeFreeText = (value, maxLength = 50) => {
    if (value == null) return '';

    if (typeof value === 'string') {
        return value.trim().slice(0, maxLength);
    }

    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'string') return item.trim();
                if (item && typeof item === 'object') {
                    return String(item.name || item._id || item.id || '').trim();
                }
                return String(item || '').trim();
            })
            .filter(Boolean)
            .join(', ')
            .slice(0, maxLength);
    }

    if (typeof value === 'object') {
        return String(value.name || value._id || value.id || '')
            .trim()
            .slice(0, maxLength);
    }

    return String(value).trim().slice(0, maxLength);
};

const serializeComplaint = (complaint, peopleMap) => {
    const plain =
        typeof complaint.toObject === 'function'
            ? complaint.toObject()
            : { ...complaint };

    return {
        ...plain,
        reporter: mapPerson(plain.reporter, peopleMap),
        reportedParty: normalizeFreeText(plain.reportedParty, 50),
        witnesses: normalizeFreeText(plain.witnesses, 200),
    };
};

const getComplaints = async (req, res, next) => {
  try {
    const complaints = await Complaint.find()
      .sort({ dateFiled: -1, createdAt: -1 })
      .lean();

    // id → person lookup for every reporter on this page (one batch fetch).
    const peopleMap = await hydratePeopleByIds(collectPersonIds(complaints));
    // Complaints ready for the API: reporter is a person object, not a raw id.
    const serialized = complaints.map((complaint) =>
      serializeComplaint(complaint, peopleMap)
    );

    res.json({
      message: 'Complaints fetched successfully',
      complaints: serialized,
    });
  } catch (error) {
    next(error);
  }
};

const getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isObjectId(id)) {
      return res.status(400).json({ message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(id).lean();
    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    const peopleMap = await hydratePeopleByIds(collectPersonIds([complaint]));

    res.json({
      message: 'Complaint fetched successfully',
      complaint: serializeComplaint(complaint, peopleMap),
    });
  } catch (error) {
    next(error);
  }
};




export {getComplaints, getComplaintById}