import mongoose from "mongoose";

const dbConnect = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_FALLBACK;

  if (!primaryUri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  try {
    await mongoose.connect(primaryUri);
    console.log("Connected to MongoDB");
    return;
  } catch (error) {
    const isSrvDnsIssue =
      error?.code === "ESERVFAIL" ||
      error?.code === "ENOTFOUND" ||
      (typeof error?.message === "string" && error.message.includes("querySrv"));

    if (isSrvDnsIssue && fallbackUri) {
      console.warn("MongoDB SRV DNS lookup failed. Trying MONGO_URI_FALLBACK...");

      try {
        await mongoose.connect(fallbackUri);
        console.log("Connected to MongoDB using fallback URI");
        return;
      } catch (fallbackError) {
        console.error("MongoDB fallback connection failed:", fallbackError);
        throw fallbackError;
      }
    }

    console.error("MongoDB connection error:", error);
    if (isSrvDnsIssue && !fallbackUri) {
      console.error(
        "Tip: add MONGO_URI_FALLBACK in .env with a non-SRV Atlas URI or local URI (example: mongodb://127.0.0.1:27017/doctors-app)."
      );
    }
    throw error;
  }
};

export default dbConnect;