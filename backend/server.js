const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
let databaseReady = false;
const JWT_SECRET = process.env.JWT_SECRET || 'ministry-management-secret';

app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    password: { type: String, required: true, trim: true },
    role: { type: String, default: 'Editor' },
    ministries: { type: [String], default: [] },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

const ministrySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true },
);

const Ministry = mongoose.model('Ministry', ministrySchema);

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ministry: { type: mongoose.Schema.Types.ObjectId, ref: 'Ministry', required: true },
  },
  { timestamps: true },
);

const Department = mongoose.model('Department', departmentSchema);

const safeUser = (user) => {
  const result = user.toObject ? user.toObject() : { ...user };
  delete result.password;
  return result;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    req.user = jwt.verify(authHeader.slice(7), JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

app.get('/api/health', (req, res) => {
  res.json({
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'disconnected',
    message: databaseReady ? 'Backend is running' : 'Backend is running, but MongoDB is unavailable',
  });
});

app.get('/api/users', async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({ message: 'MongoDB is not connected. Add this machine IP to MongoDB Atlas Network Access.' });
    }

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({ message: 'MongoDB is not connected. Add this machine IP to MongoDB Atlas Network Access.' });
    }

    const { name, email, password, role, ministries } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    if (password === process.env.ADMIN_PASSWORD) {
      return res.status(400).json({
        message: 'This password is reserved for the admin account. Please choose another password.',
      });
    }

    const existingUser = await User.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
    if (existingUser) {
      return res.status(400).json({ message: 'This user already exists.' });
    }

    const newUser = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role: role || 'Editor',
      ministries: Array.isArray(ministries) ? ministries : [],
    });

    const savedUser = await newUser.save();
    res.status(201).json(safeUser(savedUser));
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({ message: 'MongoDB is not connected.' });
    }

    const { name, email, password, ministries, isBlocked } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Name cannot be empty.' });
      updates.name = name.trim();
    }

    if (password !== undefined) {
      if (!password.trim()) return res.status(400).json({ message: 'Password cannot be empty.' });
      if (password.trim() === process.env.ADMIN_PASSWORD) {
        return res.status(400).json({ message: 'This password is reserved for the admin account.' });
      }
      updates.password = password.trim();
    }

    if (email !== undefined) {
      if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
        return res.status(400).json({ message: 'Please provide a valid email address.' });
      }
      updates.email = email.trim().toLowerCase();
    }

    if (isBlocked !== undefined) updates.isBlocked = Boolean(isBlocked);
    if (ministries !== undefined) updates.ministries = Array.isArray(ministries) ? ministries : [];

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found.' });

    res.json(safeUser(updatedUser));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user', error: error.message });
  }
});

app.get('/api/ministries', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const ministries = await Ministry.find().sort({ createdAt: -1 });
    res.json(ministries);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch ministries', error: error.message });
  }
});

app.post('/api/ministries', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'Ministry name is required.' });

    const existingMinistry = await Ministry.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingMinistry) return res.status(400).json({ message: 'This ministry already exists.' });

    const ministry = await Ministry.create({ name });
    res.status(201).json(ministry);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create ministry', error: error.message });
  }
});

app.patch('/api/ministries/:id', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: 'Ministry name is required.' });

    const ministry = await Ministry.findByIdAndUpdate(req.params.id, { name }, { new: true, runValidators: true });
    if (!ministry) return res.status(404).json({ message: 'Ministry not found.' });

    res.json(ministry);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update ministry', error: error.message });
  }
});

app.delete('/api/ministries/:id', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const ministry = await Ministry.findByIdAndDelete(req.params.id);
    if (!ministry) return res.status(404).json({ message: 'Ministry not found.' });

    res.json({ message: 'Ministry deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete ministry', error: error.message });
  }
});

app.get('/api/departments', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const departments = await Department.find().populate('ministry', 'name').sort({ createdAt: -1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments', error: error.message });
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const name = req.body.name?.trim();
    const ministryId = req.body.ministryId;
    if (!name || !ministryId) return res.status(400).json({ message: 'Department name and ministry are required.' });

    const ministry = await Ministry.findById(ministryId);
    if (!ministry) return res.status(404).json({ message: 'Selected ministry was not found.' });

    const existingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      ministry: ministryId,
    });
    if (existingDepartment) return res.status(400).json({ message: 'This department already exists under the selected ministry.' });

    const department = await Department.create({ name, ministry: ministryId });
    await department.populate('ministry', 'name');
    res.status(201).json(department);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create department', error: error.message });
  }
});

app.patch('/api/departments/:id', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const name = req.body.name?.trim();
    const ministryId = req.body.ministryId;
    if (!name || !ministryId) return res.status(400).json({ message: 'Department name and ministry are required.' });

    const ministry = await Ministry.findById(ministryId);
    if (!ministry) return res.status(404).json({ message: 'Selected ministry was not found.' });

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, ministry: ministryId },
      { new: true, runValidators: true },
    ).populate('ministry', 'name');
    if (!department) return res.status(404).json({ message: 'Department not found.' });

    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update department', error: error.message });
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    if (!databaseReady) return res.status(503).json({ message: 'MongoDB is not connected.' });

    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });

    res.json({ message: 'Department deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete department', error: error.message });
  }
});

const resolveMinistryIds = async (ministries = []) => {
  const resolved = [];

  for (const ministry of ministries) {
    if (mongoose.isValidObjectId(ministry)) {
      resolved.push(String(ministry));
      continue;
    }

    const match = await Ministry.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(String(ministry).trim())}$`, 'i') },
    }).select('_id');

    if (match) resolved.push(String(match._id));
  }

  return resolved;
};

const getAssignedMinistryId = async (user) => {
  const ministryIds = await resolveMinistryIds(user.ministries);
  return ministryIds[0] || null;
};

app.post('/api/user/auth/login', async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({ message: 'MongoDB is not connected.' });
    }

    const identifier = req.body.identifier?.trim();
    const password = req.body.password?.trim();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/email and password are required.' });
    }

    const user = await User.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${escapeRegex(identifier)}$`, 'i') } },
        { email: identifier.toLowerCase() },
      ],
    });

    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid username/email or password.' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'This account has been blocked.' });
    }

    const ministries = await resolveMinistryIds(user.ministries);
    const token = jwt.sign(
      { id: String(user._id), role: user.role, ministries },
      JWT_SECRET,
      { expiresIn: '1d' },
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email || '',
        role: user.role,
        ministries,
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to login.', error: error.message });
  }
});

app.get('/api/user/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });

    return res.json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email || '',
        role: user.role,
        ministries: await resolveMinistryIds(user.ministries),
        isBlocked: user.isBlocked,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to get current user.', error: error.message });
  }
});

app.get('/api/user/ministries', authenticateToken, async (req, res) => {
  try {
    return res.json(await Ministry.find().sort({ createdAt: -1 }));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch ministries.', error: error.message });
  }
});

app.get('/api/user/departments', authenticateToken, async (req, res) => {
  try {
    return res.json(await Department.find().populate('ministry', 'name').sort({ createdAt: -1 }));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch departments.', error: error.message });
  }
});

app.post('/api/user/departments', authenticateToken, async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const ministryId = await getAssignedMinistryId(req.user);

    if (!name) return res.status(400).json({ message: 'Department name is required.' });
    if (!ministryId) return res.status(403).json({ message: 'No ministry has been assigned to this user.' });

    const existingDepartment = await Department.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
      ministry: ministryId,
    });
    if (existingDepartment) return res.status(400).json({ message: 'This department already exists under your ministry.' });

    const department = await Department.create({ name, ministry: ministryId });
    await department.populate('ministry', 'name');
    return res.status(201).json(department);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create department.', error: error.message });
  }
});

app.patch('/api/user/departments/:id', authenticateToken, async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const ministryId = await getAssignedMinistryId(req.user);
    if (!name) return res.status(400).json({ message: 'Department name is required.' });
    if (!ministryId) return res.status(403).json({ message: 'No ministry has been assigned to this user.' });

    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    if (String(department.ministry) !== String(ministryId)) return res.status(403).json({ message: 'You can only edit departments under your assigned ministry.' });

    const duplicate = await Department.findOne({
      _id: { $ne: department._id },
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
      ministry: ministryId,
    });
    if (duplicate) return res.status(400).json({ message: 'A department with this name already exists under your ministry.' });

    department.name = name;
    await department.save();
    await department.populate('ministry', 'name');
    return res.json(department);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update department.', error: error.message });
  }
});

app.delete('/api/user/departments/:id', authenticateToken, async (req, res) => {
  try {
    const ministryId = await getAssignedMinistryId(req.user);
    const department = await Department.findById(req.params.id);
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    if (!ministryId || String(department.ministry) !== String(ministryId)) return res.status(403).json({ message: 'You can only delete departments under your assigned ministry.' });

    await Department.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Department deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete department.', error: error.message });
  }
});

app.post('/api/auth/admin-login', (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({
      message: 'Invalid password.',
    });
  }

  return res.json({
    message: 'Admin login successful.',
    user: {
      name: 'Admin',
      role: 'Admin',
    },
  });
});

const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  if (!process.env.MONGO_URI) {
    console.error('MongoDB connection skipped: MONGO_URI is missing from environment variables.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
    databaseReady = true;
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
  }
};

startServer();
