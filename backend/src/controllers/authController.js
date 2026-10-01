const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Station = require('../models/Station');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
      stationU: user.stationU || ''
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre gereklidir' });
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() }).populate('assignedStation');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Hesabınız pasife alınmıştır. Lütfen yönetici ile iletişime geçin.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Geçersiz kullanıcı adı veya şifre' });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Giriş başarılı',
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        stationU: user.stationU,
        assignedStation: user.assignedStation
      }
    });
  } catch (error) {
    console.error('[Auth Login Error]:', error);
    return res.status(500).json({ success: false, message: 'Sunucu hatası: ' + error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedStation').select('-password');
    return res.json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.seedDefaultAdminAndStationUsers = async () => {
  try {
    // 1. Seed Admin
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const defaultAdmin = new User({
        username: 'admin',
        password: 'admin123',
        fullName: 'Sistem Yöneticisi',
        role: 'admin',
        isActive: true
      });
      await defaultAdmin.save();
      console.log('[Seed] Varsayılan yönetici hesabı oluşturuldu: admin / admin123');
    }

    // 2. Seed Station Operator Users for all stations in database
    const stations = await Station.find();
    for (const st of stations) {
      const uLower = st.u.toLowerCase();
      const existingUser = await User.findOne({ username: uLower });
      if (!existingUser) {
        const defaultPassword = `${uLower}123`;
        const newUser = new User({
          username: uLower,
          password: defaultPassword,
          fullName: `${st.name} Yetkilisi`,
          role: 'station_operator',
          stationU: st.u,
          assignedStation: st._id,
          isActive: true
        });
        await newUser.save();
        console.log(`[Seed] İstasyon kullanıcısı oluşturuldu: ${uLower} / ${defaultPassword} -> ${st.name}`);
      } else {
        // Ensure stationU and assignedStation are linked
        if (!existingUser.stationU || !existingUser.assignedStation) {
          existingUser.stationU = st.u;
          existingUser.assignedStation = st._id;
          if (existingUser.role !== 'admin') {
            existingUser.role = 'station_operator';
          }
          await existingUser.save();
        }
      }
    }
  } catch (error) {
    console.error('[Seed Error] User seeding failed:', error.message);
  }
};
