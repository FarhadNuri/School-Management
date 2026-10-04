import { Schema, model } from 'mongoose';

const resourceSchema = new Schema(
  {
    resourceName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Resource name must be less than 50 characters'],
    },
    resourceDescription: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Resource description must be less than 500 characters'],
    },
    resourceType: {
      type: String,
      enum: ['Document', 'Video', 'Audio', 'Image', 'Other'],
      default: 'Document',
    },
    resourceUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Resource URL must be less than 200 characters'],
    },
    resourceIsActive: { type: Boolean, default: true, default: true },
  },
  { timestamps: true }
);

const Resource = model('Resource', resourceSchema);

export default Resource;
