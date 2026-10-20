import mongoose from 'mongoose';
import UserModel, { User } from '../models/user.model.js';

export const USER_PUBLIC_SELECT =
  'firstName lastName email photo contactInfo role gender dateOfBirth address socialMedia isActive createdAt updatedAt';

// Escapes special regex characters so user search text is treated as plain text.
export const escapeRegex = (value = '') =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Reads JSON from multipart form fields (contact info, address, etc.).
// Returns the fallback if the value is missing or invalid.
export const parseJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

// Treats boolean true, numbers 1, and strings "true" / "1" / "yes" as true.
// Form and query fields often arrive as strings.
export const isTrue = (value) => {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  return false;
};

// Validates email syntax.
export const isValidEmail = (value) =>
  /^\S+@\S+\.\S+$/.test(String(value || '').trim());

// Builds a display name from a user object or nested user.
export const formatFullName = (entity) => {
  if (!entity) return '';
  if (typeof entity === 'string') return entity.trim();
  const user = entity.user && typeof entity.user === 'object' ? entity.user : entity;
  return `${user.firstName || ''} ${user.lastName || ''}`.trim();
};

// Trims address fields and accepts region/postalCode aliases.
// Accepts both a raw object or a JSON string.
// Used when saving student, teacher, and guardian profiles.
export const normalizeAddress = (rawAddress = {}) => {
  const address =
    typeof rawAddress === 'string'
      ? parseJson(rawAddress, {})
      : rawAddress || {};

  return {
    street: address?.street?.trim() || '',
    city: address?.city?.trim() || '',
    state: (address?.state || address?.region)?.trim() || '',
    zip: (address?.zip || address?.postalCode)?.trim() || '',
    country: address?.country?.trim() || '',
  };
};

// True when street, city, state, zip, and country are all present.
// Required before creating or updating students and guardians.
export const hasCompleteAddress = (rawAddress = {}) => {
  const address = normalizeAddress(rawAddress);
  return Boolean(
    address.street &&
      address.city &&
      address.state &&
      address.zip &&
      address.country
  );
};

// Trims phone, alt phone, and WhatsApp so contact details save in a consistent shape.
// Accepts both a raw object or a JSON string.
export const normalizeContactInfo = (rawContact = {}) => {
  const contactInfo =
    typeof rawContact === 'string'
      ? parseJson(rawContact, {})
      : rawContact || {};

  return {
    phone: contactInfo?.phone?.trim() || '',
    altPhone: contactInfo?.altPhone?.trim() || '',
    whatsapp: contactInfo?.whatsapp?.trim() || '',
  };
};

// Trims social and website URLs before saving teacher and guardian accounts.
// Accepts both a raw object or a JSON string.
export const normalizeSocialMedia = (rawSocial = {}) => {
  const socialMedia =
    typeof rawSocial === 'string'
      ? parseJson(rawSocial, {})
      : rawSocial || {};

  return {
    facebook: socialMedia?.facebook?.trim() || '',
    twitter: socialMedia?.twitter?.trim() || '',
    instagram: socialMedia?.instagram?.trim() || '',
    linkedin: socialMedia?.linkedin?.trim() || '',
    youtube: socialMedia?.youtube?.trim() || '',
    website: socialMedia?.website?.trim() || '',
  };
};

// Accepts only male, female, or other; otherwise returns undefined.
// Used when saving student and teacher profiles.
export const normalizeGender = (gender) => {
  if (!gender) return undefined;
  const value = String(gender).trim().toLowerCase();
  return ['male', 'female', 'other'].includes(value) ? value : undefined;
};

// Parses an array, JSON string, or comma-separated string of IDs into unique valid Mongo ObjectIds.
export const parseObjectIds = (value) => {
  if (!value) return [];

  let items = value;
  if (typeof value === 'string') {
    try {
      items = JSON.parse(value);
    } catch {
      items = value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  if (!Array.isArray(items)) return [];

  return [
    ...new Set(
      items
        .map((item) => {
          if (item && typeof item === 'object') {
            return String(item._id || item.id || '').trim();
          }
          return String(item || '').trim();
        })
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];
};

// True if another non-deleted user already uses this email.
// Pass excludeUserId when updating so the user's own email is ignored.
export const emailTaken = async (email, excludeUserId) => {
  if (!email || typeof email !== 'string') return false;

  const filter = {
    email: email.toLowerCase().trim(),
    isDeleted: { $ne: true },
  };

  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  return Boolean(await UserModel.exists(filter));
};

// Finds user IDs for a role, optionally filtered by name, email, phone, or active status.
// Powers admin search on students, teachers, and guardians.
export const findUserIds = async ({
  role,
  search,
  isActive,
  includePhoneSearch = false,
}) => {
  const filter = {
    isDeleted: { $ne: true },
  };

  if (role) {
    filter.role = role;
  }

  // Handle both boolean and string representations of isActive
  if (isActive !== undefined && isActive !== null && isActive !== '' && isActive !== 'all') {
    if (typeof isActive === 'boolean') {
      filter.isActive = isActive;
    } else {
      const lower = String(isActive).toLowerCase().trim();
      if (lower === 'true') filter.isActive = true;
      else if (lower === 'false') filter.isActive = false;
    }
  }

  if (search?.trim()) {
    const trimmed = search.trim();
    const regex = new RegExp(escapeRegex(trimmed), 'i');
    const orConditions = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
    ];

    // If search text contains multiple words (e.g. "John Doe"), match firstName + lastName combined
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      const firstWordRegex = new RegExp(escapeRegex(words[0]), 'i');
      const restWordRegex = new RegExp(escapeRegex(words.slice(1).join(' ')), 'i');
      orConditions.push({
        $and: [
          { firstName: firstWordRegex },
          { lastName: restWordRegex },
        ],
      });
      orConditions.push({
        $and: [
          { firstName: restWordRegex },
          { lastName: firstWordRegex },
        ],
      });
    }

    if (includePhoneSearch) {
      orConditions.push(
        { 'contactInfo.phone': regex },
        { 'contactInfo.altPhone': regex },
        { 'contactInfo.whatsapp': regex }
      );
    }

    filter.$or = orConditions;
  }

  const users = await UserModel.find(filter).select('_id').lean();
  return users.map((user) => user._id);
};

export const populateUser = {
  path: 'user',
  select: USER_PUBLIC_SELECT,
};

const userHelpers = {
  USER_PUBLIC_SELECT,
  escapeRegex,
  parseJson,
  isTrue,
  isValidEmail,
  formatFullName,
  normalizeAddress,
  hasCompleteAddress,
  normalizeContactInfo,
  normalizeSocialMedia,
  normalizeGender,
  parseObjectIds,
  emailTaken,
  findUserIds,
  populateUser,
};

export default userHelpers;
