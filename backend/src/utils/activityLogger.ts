import prisma from "../lib/prisma";

export const logActivity = async (
  userId: number,
  action: string,
  details?: string
) => {
  try {
    console.log("LOGGING ACTIVITY:", action, details);

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
      },
    });

    console.log("ACTIVITY SAVED");
  } catch (error) {
    console.error("ACTIVITY LOG ERROR:", error);
  }
};