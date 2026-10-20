export const getMyPayments = async (req, res, next) => {
  try {
    res.json({ count: 0, payments: [] });
  } catch (error) {
    next(error);
  }
};

export const confirmCheckoutSession = async (req, res, next) => {
  try {
    res.json({ message: 'Checkout session confirmed' });
  } catch (error) {
    next(error);
  }
};

export const getMyPaymentById = async (req, res, next) => {
  try {
    res.json({ message: 'Payment details' });
  } catch (error) {
    next(error);
  }
};

export const checkoutPayment = async (req, res, next) => {
  try {
    res.json({ message: 'Checkout initiated' });
  } catch (error) {
    next(error);
  }
};
