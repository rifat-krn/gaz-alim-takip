const User = require('../models/User');
const Station = require('../models/Station');

// List all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('assignedStation').select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { username, password, fullName, role, isActive, assignedStation, stationU } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı, şifre ve ad-soyad alanları zorunludur' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanılmaktadır' });
    }

    let finalStationU = stationU || '';
    if (assignedStation && !finalStationU) {
      const st = await Station.findById(assignedStation);
      if (st) finalStationU = st.u;
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      fullName,
      role: role || 'station_operator',
      assignedStation: assignedStation || null,
      stationU: finalStationU,
      isActive: isActive !== undefined ? isActive : true
    });

    await user.save();

    const userResponse = await User.findById(user._id).populate('assignedStation').select('-password');
    res.status(201).json({ success: true, message: 'Kullanıcı başarıyla oluşturuldu', user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, fullName, role, isActive, password, assignedStation, stationU } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    if (username && username.toLowerCase().trim() !== user.username) {
      const existing = await User.findOne({ username: username.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor' });
      }
      user.username = username.toLowerCase().trim();
    }

    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (assignedStation !== undefined) {
      user.assignedStation = assignedStation || null;
      if (assignedStation) {
        const st = await Station.findById(assignedStation);
        if (st) user.stationU = st.u;
      } else {
        user.stationU = '';
      }
    }
    if (stationU !== undefined) user.stationU = stationU;

    if (password && password.trim().length > 0) {
      user.password = password; // pre('save') hook will hash it
    }

    await user.save();

    const userResponse = await User.findById(user._id).populate('assignedStation').select('-password');
    res.json({ success: true, message: 'Kullanıcı bilgileri güncellendi', user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user && req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'Kendinizi silemezsiniz' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.json({ success: true, message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
