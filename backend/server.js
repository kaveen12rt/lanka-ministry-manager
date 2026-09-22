const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
let databaseReady = false;

app.use(cors());
app.use(express.json());

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
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

    const users = await User.find().sort({ createdAt: -1 });
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

    const { name, password, role, ministries } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required.' });
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
      password: password.trim(),
      role: role || 'Editor',
      ministries: Array.isArray(ministries) ? ministries : [],
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user', error: error.message });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    if (!databaseReady) {
      return res.status(503).json({ message: 'MongoDB is not connected.' });
    }

    const { name, password, ministries, isBlocked } = req.body;
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

    if (isBlocked !== undefined) updates.isBlocked = Boolean(isBlocked);
    if (ministries !== undefined) updates.ministries = Array.isArray(ministries) ? ministries : [];

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found.' });

    res.json(updatedUser);
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
