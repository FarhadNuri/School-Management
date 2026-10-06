import {Schema, model} from "mongoose"

const assignmentSchema = new Schema({
  assignmentName: {type: String, required: true, trim: true, maxlength: [50, 'Assignment name must be less than 50 characters']},
  assignmentDescription: {type: String, trim: true, default: '', maxlength: [500, 'Assignment description must be less than 500 characters']},
  assignmentType: {type: String, enum: ['Assignment', 'Quiz', 'Exam', 'Other'], default: 'Assignment'},
  assignmentScore: {type: Number, min: 0, max: 100, default: 0},
  assignmentStatus: {type: String, enum: ['Active', 'Inactive'], default: 'Active'},
  assignmentCoverImage: {type: String, default: '', maxlength: [200, 'Assignment cover image must be less than 200 characters']},
  assignmentIsActive: {type: Boolean, default: true},
}, {timestamps: true});

const Assignment = model('Assignment', assignmentSchema);

export default Assignment;

