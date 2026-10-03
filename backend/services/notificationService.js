const Notification = require("../models/Notification");

const createNotification = async ({
  userId,
  type,
  title,
  message,
  idempotencyKey,
}) => {
  if (!userId) return null;
  if (idempotencyKey) {
    return Notification.findOneAndUpdate(
      { idempotencyKey },
      { $setOnInsert: { userId, type, title, message, idempotencyKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  return Notification.create({ userId, type, title, message });
};

module.exports = { createNotification };
