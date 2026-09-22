const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5002;

let databaseReady = false;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "ministry-management-secret";

/*
 * ======================================================
 * MIDDLEWARE
 * ======================================================
 */

app.use(
  cors({
    origin: [
      "http://localhost:5175",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

app.use(express.json());

/*
 * ======================================================
 * USER MODEL
 * ======================================================
 *
 * IMPORTANT:
 * This matches the Admin backend.
 *
 * ministries is an array of String IDs.
 */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      default: "Editor",
    },

    ministries: {
      type: [String],
      default: [],
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

/*
 * ======================================================
 * MINISTRY MODEL
 * ======================================================
 */

const ministrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

const Ministry = mongoose.model(
  "Ministry",
  ministrySchema
);

/*
 * ======================================================
 * DEPARTMENT MODEL
 * ======================================================
 *
 * IMPORTANT:
 * This matches the Admin backend.
 *
 * Department uses:
 *
 * ministry: ObjectId
 */

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    ministry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ministry",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Department = mongoose.model(
  "Department",
  departmentSchema
);

/*
 * ======================================================
 * AUTHENTICATION MIDDLEWARE
 * ======================================================
 */

const authenticateToken = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authentication required.",
      });
    }

    const token = authHeader.startsWith(
      "Bearer "
    )
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    const user = await User.findById(
      decoded.id
    );

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        message:
          "Your account has been blocked.",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message:
        "Invalid or expired authentication token.",
    });
  }
};

/*
 * ======================================================
 * HEALTH
 * ======================================================
 */

app.get("/api/health", (req, res) => {
  res.json({
    status: databaseReady
      ? "ok"
      : "degraded",

    database: databaseReady
      ? "connected"
      : "disconnected",

    message: databaseReady
      ? "Ministry User backend is running"
      : "Backend is running, but MongoDB is unavailable",
  });
});

/*
 * ======================================================
 * MINISTRY USER LOGIN
 * ======================================================
 *
 * Supports:
 *
 * username:
 *     isarane
 *
 * OR email:
 *     isara@gmail.com
 *
 * plus password.
 */

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      if (!databaseReady) {
        return res.status(503).json({
          message:
            "MongoDB is not connected.",
        });
      }

      const {
        identifier,
        password,
      } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({
          message:
            "Username/email and password are required.",
        });
      }

      const trimmedIdentifier =
        identifier.trim();

      /*
       * Search by username OR email
       */

      const user = await User.findOne({
        $or: [
          {
            name: {
              $regex: new RegExp(
                `^${escapeRegex(
                  trimmedIdentifier
                )}$`,
                "i"
              ),
            },
          },
          {
            email:
              trimmedIdentifier.toLowerCase(),
          },
        ],
      });

      if (!user) {
        return res.status(401).json({
          message:
            "Invalid username/email or password.",
        });
      }

      if (user.isBlocked) {
        return res.status(403).json({
          message:
            "Your account has been blocked.",
        });
      }

      /*
       * Current project uses plain-text passwords.
       * This matches your existing Admin backend.
       */

      if (user.password !== password) {
        return res.status(401).json({
          message:
            "Invalid username/email or password.",
        });
      }

      /*
       * Create JWT
       */

      const token = jwt.sign(
        {
          id: user._id.toString(),
          role: user.role,
          ministries: user.ministries || [],
        },
        JWT_SECRET,
        {
          expiresIn: "1d",
        }
      );

      /*
       * Return safe user information
       *
       * Password is NOT returned.
       */

      const safeUser = {
        id: user._id,
        name: user.name,
        email: user.email || "",
        role: user.role,
        ministries:
          user.ministries || [],
        isBlocked: user.isBlocked,
      };

      res.json({
        message: "Login successful.",
        token,
        user: safeUser,
      });
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to login.",
        error: error.message,
      });
    }
  }
);

/*
 * ======================================================
 * GET CURRENT USER
 * ======================================================
 */

app.get(
  "/api/auth/me",
  authenticateToken,
  async (req, res) => {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email || "",
        role: req.user.role,
        ministries:
          req.user.ministries || [],
        isBlocked: req.user.isBlocked,
      },
    });
  }
);

/*
 * ======================================================
 * GET ALL MINISTRIES
 * ======================================================
 *
 * Every authenticated Ministry User can view
 * every ministry.
 */

app.get(
  "/api/ministries",
  authenticateToken,
  async (req, res) => {
    try {
      const ministries =
        await Ministry.find()
          .sort({ createdAt: -1 });

      res.json(ministries);
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch ministries.",
        error: error.message,
      });
    }
  }
);

/*
 * ======================================================
 * GET ALL DEPARTMENTS
 * ======================================================
 *
 * Every authenticated Ministry User can view
 * ALL departments.
 */

app.get(
  "/api/departments",
  authenticateToken,
  async (req, res) => {
    try {
      const departments =
        await Department.find()
          .populate(
            "ministry",
            "name"
          )
          .sort({ createdAt: -1 });

      res.json(departments);
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to fetch departments.",
        error: error.message,
      });
    }
  }
);

/*
 * ======================================================
 * ADD DEPARTMENT
 * ======================================================
 *
 * User can add a department only under a ministry
 * assigned to that user.
 */

app.post(
  "/api/departments",
  authenticateToken,
  async (req, res) => {
    try {
      const name =
        req.body.name?.trim();

      const ministryId =
        req.body.ministryId;

      if (!name || !ministryId) {
        return res.status(400).json({
          message:
            "Department name and ministry are required.",
        });
      }

      /*
       * Check that ministry exists
       */

      const ministry =
        await Ministry.findById(
          ministryId
        );

      if (!ministry) {
        return res.status(404).json({
          message:
            "Selected ministry was not found.",
        });
      }

      /*
       * Check user has access to this ministry
       */

      const hasAccess =
        (req.user.ministries || [])
          .map(String)
          .includes(
            String(ministryId)
          );

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "You can only add departments under your assigned ministry.",
        });
      }

      /*
       * Check duplicate department
       */

      const existingDepartment =
        await Department.findOne({
          name: {
            $regex: new RegExp(
              `^${escapeRegex(name)}$`,
              "i"
            ),
          },
          ministry: ministryId,
        });

      if (existingDepartment) {
        return res.status(400).json({
          message:
            "This department already exists under the selected ministry.",
        });
      }

      /*
       * Create department
       */

      const department =
        await Department.create({
          name,
          ministry: ministryId,
        });

      await department.populate(
        "ministry",
        "name"
      );

      res.status(201).json(
        department
      );
    } catch (error) {
      console.error(
        "Create department error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to create department.",
        error: error.message,
      });
    }
  }
);

/*
 * ======================================================
 * EDIT DEPARTMENT
 * ======================================================
 */

app.patch(
  "/api/departments/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const name =
        req.body.name?.trim();

      if (!name) {
        return res.status(400).json({
          message:
            "Department name is required.",
        });
      }

      /*
       * Find existing department
       */

      const department =
        await Department.findById(
          req.params.id
        );

      if (!department) {
        return res.status(404).json({
          message:
            "Department not found.",
        });
      }

      /*
       * The department's current ministry
       * must belong to the logged-in user.
       */

      const hasAccess =
        (req.user.ministries || [])
          .map(String)
          .includes(
            String(
              department.ministry
            )
          );

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "You can only edit departments under your assigned ministry.",
        });
      }

      /*
       * Update name only.
       *
       * The Ministry User cannot move the department
       * to another ministry.
       */

      department.name = name;

      await department.save();

      await department.populate(
        "ministry",
        "name"
      );

      res.json(department);
    } catch (error) {
      console.error(
        "Update department error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to update department.",
        error: error.message,
      });
    }
  }
);

/*
 * ======================================================
 * DELETE DEPARTMENT
 * ======================================================
 */

app.delete(
  "/api/departments/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const department =
        await Department.findById(
          req.params.id
        );

      if (!department) {
        return res.status(404).json({
          message:
            "Department not found.",
        });
      }

      /*
       * Check ownership
       */

      const hasAccess =
        (req.user.ministries || [])
          .map(String)
          .includes(
            String(
              department.ministry
            )
          );

      if (!hasAccess) {
        return res.status(403).json({
          message:
            "You can only delete departments under your assigned ministry.",
        });
      }

      await Department.findByIdAndDelete(
        req.params.id
      );

      res.json({
        message:
          "Department deleted successfully.",
      });
    } catch (error) {
      console.error(
        "Delete department error:",
        error
      );

      res.status(500).json({
        message:
          "Failed to delete department.",
        error: error.message,
      });
    }
  }
);

/*
 * ======================================================
 * ESCAPE REGEX
 * ======================================================
 */

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

/*
 * ======================================================
 * START SERVER
 * ======================================================
 */

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(
      `Ministry User Server running on http://localhost:${PORT}`
    );
  });

  if (!process.env.MONGO_URI) {
    console.error(
      "MongoDB connection skipped: MONGO_URI is missing."
    );

    return;
  }

  try {
    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 5000,
      }
    );

    databaseReady = true;

    console.log(
      "MongoDB connected successfully"
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );
  }
};

startServer();