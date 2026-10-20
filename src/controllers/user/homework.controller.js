import HomeworkModel from '../../models/homework.model.js';
import {
  assertValidObjectId,
  resolveAccessContext,
  serializeHomework,
  homeworkPopulate,
  buildHomeworkVisibilityQuery,
  canAccessHomework,
} from '../../utils/homeworkAccess.js';

export const getMyHomeworks = async (req, res, next) => {
  try {
    const context = await resolveAccessContext(req.user);
    const query = buildHomeworkVisibilityQuery(context);

    if (query._id === null) {
      return res.json({ count: 0, homeworks: [] });
    }

    const homeworks = await HomeworkModel.find(query)
      .populate(homeworkPopulate)
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    const serialized = homeworks.map(serializeHomework);

    res.json({
      count: serialized.length,
      homeworks: serialized,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyHomeworkById = async (req, res, next) => {
  try {
    const { id } = req.params;
    assertValidObjectId(id, 'homework ID');

    const context = await resolveAccessContext(req.user);
    const homework = await HomeworkModel.findOne({
      _id: id,
      isActive: true,
    })
      .populate(homeworkPopulate)
      .lean();

    if (!homework || !canAccessHomework(homework, context)) {
      return res.status(404).json({ message: 'Homework not found' });
    }

    res.json({ homework: serializeHomework(homework) });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    next(error);
  }
};
