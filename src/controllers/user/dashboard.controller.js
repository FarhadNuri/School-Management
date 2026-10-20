// Dashboard controller for user routes
export const getMyDashboard = async (req, res, next) => {
  try {
    res.json({ message: 'Dashboard data' });
  } catch (error) {
    next(error);
  }
};
