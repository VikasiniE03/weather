import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dbConnection } from "./db.js";
import { UserModel } from "../models/User.js";
import { WeatherStationModel } from "../models/WeatherStation.js";
import { SensorReadingModel } from "../models/SensorReading.js";
import { AnomalyIncidentModel } from "../models/AnomalyIncident.js";
import { DashboardNotificationModel } from "../models/DashboardNotification.js";
import { SmsDispatchRecordModel } from "../models/SmsDispatchRecord.js";
import { AuditLogModel } from "../models/AuditLog.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

class DataRepository {
  constructor() {
    this.dataDir = DATA_DIR;
    this.ensureDataDir();

    // File-store state cache
    this.cache = {
      users: [],
      stations: [],
      readings: [],
      incidents: [],
      notifications: [],
      smsLogs: [],
      auditLogs: []
    };

    this.loadFromFileStore();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      try {
        fs.mkdirSync(this.dataDir, { recursive: true });
      } catch (err) {
        console.error("Failed to create data directory:", err.message);
      }
    }
  }

  getFilePath(entity) {
    return path.join(this.dataDir, `${entity}.json`);
  }

  loadFromFileStore() {
    const entities = ["users", "stations", "readings", "incidents", "notifications", "smsLogs", "auditLogs"];
    for (const entity of entities) {
      const file = this.getFilePath(entity);
      if (fs.existsSync(file)) {
        try {
          const raw = fs.readFileSync(file, "utf8");
          this.cache[entity] = JSON.parse(raw);
        } catch (err) {
          console.warn(`[DATA] Warning reading ${entity}.json:`, err.message);
          this.cache[entity] = [];
        }
      } else {
        this.cache[entity] = [];
      }
    }
  }

  saveEntityToFile(entity) {
    try {
      this.ensureDataDir();
      const file = this.getFilePath(entity);
      fs.writeFileSync(file, JSON.stringify(this.cache[entity], null, 2), "utf8");
    } catch (err) {
      console.error(`[DATA] Error saving ${entity} to disk:`, err.message);
    }
  }

  // ================= USERS =================
  async findUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.toLowerCase().trim();
    if (dbConnection.isMongoConnected) {
      return await UserModel.findOne({ email: cleanEmail }).lean();
    }
    return this.cache.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }

  async findUserById(userId) {
    if (dbConnection.isMongoConnected) {
      return await UserModel.findOne({ userId }).lean();
    }
    return this.cache.users.find((u) => u.userId === userId) || null;
  }

  async createUser(userData) {
    if (dbConnection.isMongoConnected) {
      const created = await UserModel.create(userData);
      return created.toObject();
    }
    const record = {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.cache.users.push(record);
    this.saveEntityToFile("users");
    return record;
  }

  async getAllUsers() {
    if (dbConnection.isMongoConnected) {
      return await UserModel.find({}, { passwordHash: 0 }).lean();
    }
    return this.cache.users.map(({ passwordHash, ...rest }) => rest);
  }

  // ================= STATIONS =================
  async getAllStations() {
    if (dbConnection.isMongoConnected) {
      return await WeatherStationModel.find({}).lean();
    }
    return this.cache.stations;
  }

  async getStationById(stationId) {
    if (dbConnection.isMongoConnected) {
      return await WeatherStationModel.findOne({ stationId }).lean();
    }
    return this.cache.stations.find((s) => s.stationId === stationId) || null;
  }

  async upsertStation(stationData) {
    if (dbConnection.isMongoConnected) {
      return await WeatherStationModel.findOneAndUpdate(
        { stationId: stationData.stationId || stationData.id },
        { ...stationData, stationId: stationData.stationId || stationData.id },
        { upsert: true, new: true }
      ).lean();
    }

    const id = stationData.stationId || stationData.id;
    const idx = this.cache.stations.findIndex((s) => s.stationId === id || s.id === id);
    const updated = {
      ...stationData,
      stationId: id,
      updatedAt: new Date().toISOString()
    };

    if (idx >= 0) {
      this.cache.stations[idx] = { ...this.cache.stations[idx], ...updated };
    } else {
      this.cache.stations.push({
        ...updated,
        createdAt: new Date().toISOString()
      });
    }
    this.saveEntityToFile("stations");
    return updated;
  }

  // ================= READINGS =================
  async saveReading(reading) {
    if (dbConnection.isMongoConnected) {
      return await SensorReadingModel.create(reading);
    }
    const record = {
      ...reading,
      _id: `read_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: reading.timestamp || new Date().toISOString()
    };
    this.cache.readings.push(record);
    // Keep max 2000 readings in memory/disk cache to prevent unbounded file size
    if (this.cache.readings.length > 2000) {
      this.cache.readings.splice(0, this.cache.readings.length - 2000);
    }
    // Throttle file save for readings
    this._scheduleReadingSave();
    return record;
  }

  _scheduleReadingSave() {
    if (this._readingSaveTimer) return;
    this._readingSaveTimer = setTimeout(() => {
      this.saveEntityToFile("readings");
      this._readingSaveTimer = null;
    }, 4000);
  }

  async getStationReadings(stationId, limit = 50) {
    if (dbConnection.isMongoConnected) {
      return await SensorReadingModel.find({ stationId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean()
        .then((res) => res.reverse());
    }

    const filtered = this.cache.readings.filter((r) => r.stationId === stationId);
    return filtered.slice(-limit);
  }

  // ================= INCIDENTS =================
  async getIncidents({ stationId = null, status = null, limit = 50 } = {}) {
    if (dbConnection.isMongoConnected) {
      const query = {};
      if (stationId) query.stationId = stationId;
      if (status) query.status = status;
      return await AnomalyIncidentModel.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
    }

    let list = this.cache.incidents;
    if (stationId) list = list.filter((i) => i.stationId === stationId);
    if (status) list = list.filter((i) => i.status === status);
    return list.slice(0, limit);
  }

  async getIncidentById(incidentId) {
    if (dbConnection.isMongoConnected) {
      return await AnomalyIncidentModel.findOne({ incidentId }).lean();
    }
    return this.cache.incidents.find((i) => i.incidentId === incidentId) || null;
  }

  async findActiveIncident(stationId, faultType) {
    if (dbConnection.isMongoConnected) {
      return await AnomalyIncidentModel.findOne({
        stationId,
        faultType,
        status: { $in: ["OPEN", "ACKNOWLEDGED"] }
      }).lean();
    }

    return (
      this.cache.incidents.find(
        (i) =>
          i.stationId === stationId &&
          i.faultType === faultType &&
          (i.status === "OPEN" || i.status === "ACKNOWLEDGED")
      ) || null
    );
  }

  async saveIncident(incidentData) {
    if (dbConnection.isMongoConnected) {
      if (incidentData._id) {
        return await AnomalyIncidentModel.findByIdAndUpdate(incidentData._id, incidentData, {
          new: true
        }).lean();
      }
      return await AnomalyIncidentModel.create(incidentData);
    }

    const idx = this.cache.incidents.findIndex((i) => i.incidentId === incidentData.incidentId);
    const now = new Date().toISOString();

    if (idx >= 0) {
      this.cache.incidents[idx] = {
        ...this.cache.incidents[idx],
        ...incidentData,
        lastSeenAt: now,
        updatedAt: now
      };
      this.saveEntityToFile("incidents");
      return this.cache.incidents[idx];
    }

    const newRec = {
      ...incidentData,
      status: incidentData.status || "OPEN",
      notes: incidentData.notes || [],
      createdAt: now,
      lastSeenAt: now,
      updatedAt: now
    };
    this.cache.incidents.unshift(newRec);
    if (this.cache.incidents.length > 300) this.cache.incidents.pop();
    this.saveEntityToFile("incidents");
    return newRec;
  }

  async acknowledgeIncident(incidentId, user, noteText = "") {
    const update = {
      status: "ACKNOWLEDGED",
      acknowledgedAt: new Date().toISOString(),
      acknowledgedBy: {
        userId: user.userId || user.id,
        name: user.name,
        role: user.role
      }
    };

    if (dbConnection.isMongoConnected) {
      const doc = await AnomalyIncidentModel.findOne({ incidentId });
      if (!doc) return null;
      doc.status = "ACKNOWLEDGED";
      doc.acknowledgedAt = new Date();
      doc.acknowledgedBy = update.acknowledgedBy;
      if (noteText) {
        doc.notes.push({
          noteId: `note_${Date.now()}`,
          text: noteText,
          authorName: user.name,
          authorRole: user.role,
          authorEmail: user.email,
          timestamp: new Date()
        });
      }
      await doc.save();
      return doc.toObject();
    }

    const inc = this.cache.incidents.find((i) => i.incidentId === incidentId);
    if (!inc) return null;
    inc.status = "ACKNOWLEDGED";
    inc.acknowledgedAt = update.acknowledgedAt;
    inc.acknowledgedBy = update.acknowledgedBy;
    if (noteText) {
      inc.notes = inc.notes || [];
      inc.notes.push({
        noteId: `note_${Date.now()}`,
        text: noteText,
        authorName: user.name,
        authorRole: user.role,
        authorEmail: user.email,
        timestamp: new Date().toISOString()
      });
    }
    this.saveEntityToFile("incidents");
    return inc;
  }

  async resolveIncident(incidentId, user, resolutionNote = "") {
    const now = new Date().toISOString();
    const update = {
      status: "RESOLVED",
      resolvedAt: now,
      resolvedBy: {
        userId: user.userId || user.id,
        name: user.name,
        role: user.role,
        resolutionNote: resolutionNote || "Resolved by operator verification"
      }
    };

    if (dbConnection.isMongoConnected) {
      const doc = await AnomalyIncidentModel.findOne({ incidentId });
      if (!doc) return null;
      doc.status = "RESOLVED";
      doc.resolvedAt = new Date();
      doc.resolvedBy = update.resolvedBy;
      if (resolutionNote) {
        doc.notes.push({
          noteId: `note_${Date.now()}`,
          text: `Resolution: ${resolutionNote}`,
          authorName: user.name,
          authorRole: user.role,
          authorEmail: user.email,
          timestamp: new Date()
        });
      }
      await doc.save();
      return doc.toObject();
    }

    const inc = this.cache.incidents.find((i) => i.incidentId === incidentId);
    if (!inc) return null;
    inc.status = "RESOLVED";
    inc.resolvedAt = now;
    inc.resolvedBy = update.resolvedBy;
    if (resolutionNote) {
      inc.notes = inc.notes || [];
      inc.notes.push({
        noteId: `note_${Date.now()}`,
        text: `Resolution: ${resolutionNote}`,
        authorName: user.name,
        authorRole: user.role,
        authorEmail: user.email,
        timestamp: now
      });
    }
    this.saveEntityToFile("incidents");
    return inc;
  }

  async addIncidentNote(incidentId, user, text) {
    const note = {
      noteId: `note_${Date.now()}`,
      text,
      authorName: user.name,
      authorRole: user.role,
      authorEmail: user.email,
      timestamp: new Date().toISOString()
    };

    if (dbConnection.isMongoConnected) {
      const doc = await AnomalyIncidentModel.findOne({ incidentId });
      if (!doc) return null;
      doc.notes.push(note);
      await doc.save();
      return doc.toObject();
    }

    const inc = this.cache.incidents.find((i) => i.incidentId === incidentId);
    if (!inc) return null;
    inc.notes = inc.notes || [];
    inc.notes.push(note);
    this.saveEntityToFile("incidents");
    return inc;
  }

  // ================= NOTIFICATIONS =================
  async createNotification(notifData) {
    const id = notifData.notificationId || `NOTIF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const fullData = {
      ...notifData,
      notificationId: id,
      isRead: false,
      createdAt: notifData.createdAt || new Date().toISOString()
    };

    if (dbConnection.isMongoConnected) {
      return await DashboardNotificationModel.create(fullData);
    }

    this.cache.notifications.unshift(fullData);
    if (this.cache.notifications.length > 200) this.cache.notifications.pop();
    this.saveEntityToFile("notifications");
    return fullData;
  }

  async getNotificationsForUser(user, unreadOnly = false) {
    if (dbConnection.isMongoConnected) {
      const query = {};
      if (unreadOnly) query.isRead = false;

      if (user.role === "operator" && user.assignedStationId) {
        query.$or = [
          { recipientRole: "all" },
          { recipientStationId: user.assignedStationId },
          { stationId: user.assignedStationId }
        ];
      }

      return await DashboardNotificationModel.find(query).sort({ createdAt: -1 }).limit(100).lean();
    }

    let list = this.cache.notifications;
    if (user.role === "operator" && user.assignedStationId) {
      list = list.filter(
        (n) =>
          n.recipientRole === "all" ||
          n.recipientStationId === user.assignedStationId ||
          n.stationId === user.assignedStationId
      );
    }
    if (unreadOnly) {
      list = list.filter((n) => !n.isRead);
    }
    return list.slice(0, 100);
  }

  async markNotificationRead(notificationId) {
    if (dbConnection.isMongoConnected) {
      return await DashboardNotificationModel.findOneAndUpdate(
        { notificationId },
        { isRead: true, readAt: new Date() },
        { new: true }
      ).lean();
    }

    const notif = this.cache.notifications.find((n) => n.notificationId === notificationId);
    if (notif) {
      notif.isRead = true;
      notif.readAt = new Date().toISOString();
      this.saveEntityToFile("notifications");
    }
    return notif;
  }

  async markAllNotificationsRead(user) {
    if (dbConnection.isMongoConnected) {
      const query = { isRead: false };
      if (user.role === "operator" && user.assignedStationId) {
        query.stationId = user.assignedStationId;
      }
      return await DashboardNotificationModel.updateMany(query, {
        isRead: true,
        readAt: new Date()
      });
    }

    let count = 0;
    for (const n of this.cache.notifications) {
      if (user.role === "admin" || n.stationId === user.assignedStationId) {
        if (!n.isRead) {
          n.isRead = true;
          n.readAt = new Date().toISOString();
          count++;
        }
      }
    }
    this.saveEntityToFile("notifications");
    return { modifiedCount: count };
  }

  // ================= SMS LOGS =================
  async saveSmsRecord(record) {
    if (dbConnection.isMongoConnected) {
      return await SmsDispatchRecordModel.create(record);
    }
    this.cache.smsLogs.unshift(record);
    if (this.cache.smsLogs.length > 100) this.cache.smsLogs.pop();
    this.saveEntityToFile("smsLogs");
    return record;
  }

  async getSmsLogs(stationId = null, limit = 50) {
    if (dbConnection.isMongoConnected) {
      const query = stationId ? { stationId } : {};
      return await SmsDispatchRecordModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    }
    let list = this.cache.smsLogs;
    if (stationId) list = list.filter((l) => l.stationId === stationId);
    return list.slice(0, limit);
  }

  // ================= AUDIT LOGS =================
  async logAudit(action, performedBy, targetStationId = null, details = {}) {
    const record = {
      logId: `AUDIT-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      action,
      performedBy: {
        userId: performedBy?.userId || performedBy?.id || "SYSTEM",
        name: performedBy?.name || "System",
        role: performedBy?.role || "system",
        email: performedBy?.email || ""
      },
      targetStationId,
      details,
      createdAt: new Date().toISOString()
    };

    if (dbConnection.isMongoConnected) {
      await AuditLogModel.create(record).catch((e) => console.warn("Audit log error:", e.message));
      return record;
    }

    this.cache.auditLogs.unshift(record);
    if (this.cache.auditLogs.length > 200) this.cache.auditLogs.pop();
    this.saveEntityToFile("auditLogs");
    return record;
  }

  async getAuditLogs(limit = 100) {
    if (dbConnection.isMongoConnected) {
      return await AuditLogModel.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    }
    return this.cache.auditLogs.slice(0, limit);
  }
}

export const repository = new DataRepository();
