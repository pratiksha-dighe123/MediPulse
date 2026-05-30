import VisitorCounter from "../models/visitorCounterModel.js";

export const getVisitorCount = async (projectId = "portfolio") => {
  try {
    let counter = await VisitorCounter.findOne({ projectId });

    if (!counter) {
      counter = await VisitorCounter.create({
        projectId,
        visitorCount: 0,
      });
    }

    return counter;
  } catch (error) {
    console.error("Error getting visitor count:", error);
    throw error;
  }
};

export const incrementVisitorCount = async (projectId = "portfolio") => {
  try {
    const counter = await VisitorCounter.findOneAndUpdate(
      { projectId },
      {
        $inc: { visitorCount: 1 },
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    return counter;
  } catch (error) {
    console.error("Error incrementing visitor count:", error);
    throw error;
  }
};

export const resetVisitorCount = async (projectId = "portfolio") => {
  try {
    const counter = await VisitorCounter.findOneAndUpdate(
      { projectId },
      {
        visitorCount: 0,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    return counter;
  } catch (error) {
    console.error("Error resetting visitor count:", error);
    throw error;
  }
};
