import { Schema, model } from 'mongoose';

const guardianSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    students: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
    idType: {
      type: String,
      required: true,
      enum: ['National ID', 'Passport', "Driver's License", 'Other'],
      default: 'National ID',
    },
    idPhoto: { type: String, default: '' },
    identification: {
      front: { type: String, default: '' },
      back: { type: String, default: '' },
    },
    stripeCustomerId: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const Guardian = model('Guardian', guardianSchema);

export default Guardian;
