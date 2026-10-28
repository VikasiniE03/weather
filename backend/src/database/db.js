import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aerosense";

class DatabaseConnection {
  constructor() {
    this.isMongoConnected = false;
    this.activeDriver = "file-persistent-fallback"; // default until proven connected
    this.error = null;
    this.connectionUri = MONGODB_URI;
  }

  async connect() {
    try {
      // Short timeout so startup doesn't hang if local mongod is not running
      await mongoose.connect(this.connectionUri, {
        serverSelectionTimeoutMS: 2000,
        connectTimeoutMS: 2000
      });

      this.isMongoConnected = true;
      this.activeDriver = "mongodb";
      this.error = null;
      console.log(`✅ [DATABASE] Connected to MongoDB at ${this.connectionUri}`);
      return { success: true, driver: "mongodb" };
    } catch (err) {
      this.isMongoConnected = false;
      this.activeDriver = "file-persistent-fallback";
      this.error = err.message;
      console.warn(
        `⚠️ [DATABASE] MongoDB connection unestablished (${err.message}). Activating Persistent File-Backed JSON Store at backend/data/. Data will persist across restarts.`
      );
      return { success: false, driver: "file-persistent-fallback", error: err.message };
    }
  }

  getStatus() {
    return {
      isMongoConnected: this.isMongoConnected,
      activeDriver: this.activeDriver,
      connectionUri: this.isMongoConnected ? this.connectionUri.replace(/:([^:@]+)@/, ":****@") : null,
      error: this.error,
      persistent: true // Guaranteed persistent in both modes (MongoDB or File Store)
    };
  }

  async disconnect() {
    if (this.isMongoConnected) {
      await mongoose.disconnect();
      this.isMongoConnected = false;
    }
  }
}

export const dbConnection = new DatabaseConnection();
