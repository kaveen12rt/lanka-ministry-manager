const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5002;

let databaseReady = false;

const JWT_SECRET =
  process.env.JWT_SECRET || "ministry-management-secret";

// ======================================================
// CORS
// ======================================================

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5180",
  "http://localhost:5177",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.log("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// ======================================================
// USER MODEL
// ======================================================

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    password: { type: String, required: true, trim: true },
    role: { type: String, default: "Editor" },
    ministries: { type: [String], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

// ======================================================
// MINISTRY MODEL
// ======================================================

const ministrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  { timestamps: true }
);

const Ministry = mongoose.model("Ministry", ministrySchema);

// ======================================================
// DEPARTMENT MODEL
// ======================================================

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ministry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      required: true,
    },
  },
  { timestamps: true }
);

const Department = mongoose.model("Department", departmentSchema);

// ======================================================
// ESCAPE REGEX
// ======================================================

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token.",
    });
  }
};

// ======================================================
// HEALTH
// ======================================================

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ministries: user.ministries || [],
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    console.error("Auth/me error:", error);

    res.status(500).json({
      message: "Failed to get current user.",
    });
  }
});

// ======================================================
// LOGIN
// ======================================================

app.post("/api/auth/login", async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({
        message:
          "MongoDB is not connected. Please start MongoDB and try again.",
      });
    }

    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: "Username/email and password are required." });
    }

    const trimmedIdentifier = identifier.trim();

console.log("LOGIN DEBUG");
console.log("Identifier:", trimmedIdentifier);

const user = await User.findOne({
  $or: [
    {
      name: {
        $regex: new RegExp(
          `^${escapeRegex(trimmedIdentifier)}$`,
          "i"
        ),
      },
    },
    {
      email: trimmedIdentifier.toLowerCase(),
    },
  ],
});

console.log("User found:", user);
if (user) {
  console.log("User name:", user.name);
  console.log("User email:", user.email);
  console.log("User password:", user.password);
}
    const token = jwt.sign(
      {
        id: user._id.toString(),
        role: user.role,
        ministries: user.ministries || [],
      },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email || "",
      role: user.role,
      ministries: user.ministries || [],
      isBlocked: user.isBlocked,
    };

    return res.json({
      message: "Login successful.",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res
      .status(500)
      .json({ message: "Failed to login.", error: error.message });
  }
});

// ======================================================
// CURRENT USER
// ======================================================

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  return res.json({
    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      email: req.user.email || "",
      role: req.user.role,
      ministries: req.user.ministries || [],
      isBlocked: req.user.isBlocked,
    },
  });
});

// ======================================================
// GET ALL MINISTRIES
// ======================================================

app.get("/api/ministries", authenticateToken, async (req, res) => {
  try {
    const ministries = await Ministry.find().sort({ createdAt: -1 });
    return res.json(ministries);
  } catch (error) {
    console.error("Fetch ministries error:", error);
    return res.status(500).json({ message: "Failed to fetch ministries." });
  }
});

// ======================================================
// GET ALL DEPARTMENTS
// ======================================================

app.get("/api/departments", authenticateToken, async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("ministry", "name")
      .sort({ createdAt: -1 });
    return res.json(departments);
  } catch (error) {
    console.error("Fetch departments error:", error);
    return res.status(500).json({ message: "Failed to fetch departments." });
  }
});

// ======================================================
// ADD DEPARTMENT
// ======================================================

app.post("/api/departments", authenticateToken, async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const assignedMinistryId = req.user.ministries?.[0];

    if (!name)
      return res
        .status(400)
        .json({ message: "Department name is required." });

    if (!assignedMinistryId)
      return res.status(403).json({
        message: "No ministry has been assigned to this user.",
      });

    const ministry = await Ministry.findById(assignedMinistryId);
    if (!ministry)
      return res
        .status(404)
        .json({ message: "Assigned ministry was not found." });

    const existingDepartment = await Department.findOne({
      name: {
        $regex: new RegExp(`^${escapeRegex(name)}$`, "i"),
      },
      ministry: assignedMinistryId,
    });

    if (existingDepartment)
      return res.status(400).json({
        message: "This department already exists under your ministry.",
      });

    const department = await Department.create({
      name,
      ministry: assignedMinistryId,
    });

    await department.populate("ministry", "name");

    return res.status(201).json(department);
  } catch (error) {
    console.error("Create department error:", error);
    return res.status(500).json({
      message: "Failed to create department.",
      error: error.message,
    });
  }
});

// ======================================================
// EDIT DEPARTMENT
// ======================================================

app.patch("/api/departments/:id", authenticateToken, async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name)
      return res
        .status(400)
        .json({ message: "Department name is required." });

    const department = await Department.findById(req.params.id);
    if (!department)
      return res.status(404).json({ message: "Department not found." });

    const assignedMinistryId = req.user.ministries?.[0];
    if (!assignedMinistryId)
      return res.status(403).json({
        message: "No ministry has been assigned to this user.",
      });

    if (String(department.ministry) !== String(assignedMinistryId))
      return res.status(403).json({
        message:
          "You can only edit departments under your assigned ministry.",
      });

    const duplicate = await Department.findOne({
      _id: { $ne: department._id },
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, "i") },
      ministry: assignedMinistryId,
    });

    if (duplicate)
      return res.status(400).json({
        message:
          "A department with this name already exists under your ministry.",
      });

    department.name = name;
    await department.save();
    await department.populate("ministry", "name");

    return res.json(department);
  } catch (error) {
    console.error("Update department error:", error);
    return res.status(500).json({
      message: "Failed to update department.",
      error: error.message,
    });
  }
});

// ======================================================
// DELETE DEPARTMENT
// ======================================================

app.delete("/api/departments/:id", authenticateToken, async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department)
      return res.status(404).json({ message: "Department not found." });

    const assignedMinistryId = req.user.ministries?.[0];
    if (!assignedMinistryId)
      return res.status(403).json({
        message: "No ministry has been assigned to this user.",
      });

    if (String(department.ministry) !== String(assignedMinistryId))
      return res.status(403).json({
        message:
          "You can only delete departments under your assigned ministry.",
      });

    await Department.findByIdAndDelete(req.params.id);

    return res.json({ message: "Department deleted successfully." });
  } catch (error) {
    console.error("Delete department error:", error);
    return res.status(500).json({
      message: "Failed to delete department.",
      error: error.message,
    });
  }
});

// ======================================================
// START SERVER
// ======================================================

const startServer = async () => {
  if (!process.env.MONGO_URI) {
    console.error("ERROR: MONGO_URI is missing from .env");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    databaseReady = true;
    console.log("✅ MongoDB connected successfully");
    console.log(
      `   Database: ${mongoose.connection.name}`
    );
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    console.error("");
    console.error("Common causes:");
    console.error("  1. Wrong password in MONGO_URI");
    console.error("  2. Your current IP is not whitelisted in Atlas");
    console.error("  3. Atlas cluster is paused (free tier pauses after 60 days idle)");
    console.error("  4. Network/DNS blocking *.mongodb.net");
    console.error("");
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Ministry User Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();