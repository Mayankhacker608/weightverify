const express = require("express");
const Notification = require("../models/Notification");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const filter = {
      userId: req.user._id,
    };
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(100),
      Notification.countDocuments({ ...filter, read: false }),
    ]);
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to load notifications." });
  }
});

router.put("/:id/read", protect, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!notification)
      return res.status(404).json({ message: "Notification not found." });
    notification.read = true;
    await notification.save();
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: "Failed to update notification." });
  }
});

module.exports = router;
