import { Schema, model } from 'mongoose';


const eventSchema = new Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: '' },
  startDate: { type: Date, required: true },
  startTime: { type: Date, required: true },
  endDate: { type: Date, required: true },
  endTime: { type: Date, required: true },
  location: { type: String, trim: true, default: '' },
  attendees: [{ type: Schema.Types.ObjectId, ref: 'Student' }],
  organizers: [{ type: Schema.Types.ObjectId, ref: 'Teacher' }],
  classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
}, { timestamps: true });

const Event = model('Event', eventSchema);

export default Event;