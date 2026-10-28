const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { authenticate, adminOnly, JWT_SECRET } = require('../src/middleware/authMiddleware');
const { sanitizeName, parseDateParts } = require('../src/middleware/uploadMiddleware');
const authController = require('../src/controllers/authController');
const { normalizeEmails } = require('../src/controllers/userController');

// Helper to create mock Express req/res
function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

describe('1. JWT & Kimlik Doğrulama Güvenlik Testleri (jsonwebtoken)', () => {
  it('Authorization başlığı olmayan istekleri 401 ile reddetmeli', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(nextCalled, false);
  });

  it('Sahte (farklı secret ile imzalanmış) JWT tokenlarını 401 ile reddetmeli', async () => {
    const forgedToken = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'admin' }, 'wrong_secret_key');
    const req = { headers: { authorization: `Bearer ${forgedToken}` } };
    const res = createMockRes();
    let nextCalled = false;

    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(nextCalled, false);
  });

  it('Süresi dolmuş (expired) JWT tokenlarını 401 ile reddetmeli', async () => {
    const expiredToken = jwt.sign(
      { id: '507f1f77bcf86cd799439011', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = createMockRes();
    let nextCalled = false;

    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(nextCalled, false);
  });
});

describe('2. Rol Tabanlı Erişim Kontrolü - RBAC Testleri (Express Middleware)', () => {
  it('Standart istasyon kullanıcısının (station_operator) admin uç noktalarına erişimini 403 ile engellemeli', () => {
    const req = { user: { username: 'kepez', role: 'station_operator' } };
    const res = createMockRes();
    let nextCalled = false;

    adminOnly(req, res, () => { nextCalled = true; });

    assert.equal(res.statusCode, 403);
    assert.equal(res.body.success, false);
    assert.equal(nextCalled, false);
  });

  it('Admin rolüne sahip kullanıcının geçişine izin vermeli', () => {
    const req = { user: { username: 'admin', role: 'admin' } };
    const res = createMockRes();
    let nextCalled = false;

    adminOnly(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, 200);
  });
});

describe('3. Şifre Kriptografi & Hashing Güvenlik Testleri (bcryptjs)', () => {
  it('Şifreleri düz metin olarak saklamamalı ve bcrypt salt ile doğrulamalı', async () => {
    const plainPassword = 'GucluSifre!2026';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(plainPassword, salt);

    assert.notEqual(hash, plainPassword);
    assert.match(hash, /^\$2[abxy]\$\d+\$/);

    const isValid = await bcrypt.compare(plainPassword, hash);
    const isInvalid = await bcrypt.compare('YanlisSifre', hash);

    assert.equal(isValid, true);
    assert.equal(isInvalid, false);
  });
});

describe('4. NoSQL Injection Koruması Testleri (Mongoose & Express)', () => {
  it('Login uç noktasında NoSQL operatör enjeksiyonu ({ $gt: "" }) içeren nesneleri 400 ile reddetmeli', async () => {
    const req = {
      body: {
        username: { $gt: '' },
        password: { $ne: null }
      }
    };
    const res = createMockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });

  it('Login uç noktasında dizi (Array) veya boş payload gönderildiğinde 400 ile reddetmeli', async () => {
    const req = {
      body: {
        username: ['admin'],
        password: null
      }
    };
    const res = createMockRes();

    await authController.login(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.success, false);
  });
});

describe('5. Dosya Yükleme & Path Traversal Koruması Testleri (Multer & Filesystem)', () => {
  it('sanitizeName fonksiyonu dizin aşımı (../) ve özel karakterleri tamamen temizlemeli', () => {
    const maliciousInput = '../../../etc/passwd\0<script>alert(1)</script>';
    const sanitized = sanitizeName(maliciousInput);

    assert.equal(sanitized.includes('..'), false);
    assert.equal(sanitized.includes('/'), false);
    assert.equal(sanitized.includes('\\'), false);
    assert.equal(sanitized.includes('<'), false);
    assert.match(sanitized, /^[a-z0-9-]+$/);
  });

  it('sanitizeName Türkçe karakterleri güvenli ASCII dosya/klasör adına dönüştürmeli', () => {
    const stationName = 'Çanakkale / Bayramiç İğneada Şube';
    const sanitized = sanitizeName(stationName);

    assert.equal(sanitized, 'canakkale-bayramic-igneada-sube');
  });

  it('parseDateParts tarih parametresi içerisindeki olası path traversal karakterlerini temizlemeli', () => {
    const maliciousDate = '2026-../../09-27';
    const parts = parseDateParts(maliciousDate);

    assert.equal(parts.year, '2026');
    assert.equal(parts.month, '09');
    assert.equal(parts.day, '27');
    assert.match(parts.year, /^\d{4}$/);
    assert.match(parts.month, /^\d{2}$/);
    assert.match(parts.day, /^\d{2}$/);
  });
});

describe('6. E-Posta (SMTP) Header Injection & Alıcı Doğrulama Testleri (Nodemailer)', () => {
  it('normalizeEmails CRLF, XSS ve geçersiz e-posta adreslerini filtrelemeli ve tekilleştirmeli', () => {
    const rawEmails = [
      '  Yonetim@Sirket.com ',
      'yonetim@sirket.com', // duplicate
      'operasyon@sirket.com; teknik@sirket.com',
      'saldirgan@evil.com\r\nBcc: gizli@evil.com',
      '<script>alert(1)</script>@evil.com',
      'gecersiz-mail-adresi',
      'kullanici@'
    ];

    const cleaned = normalizeEmails(rawEmails);

    assert.deepEqual(cleaned, [
      'yonetim@sirket.com',
      'operasyon@sirket.com',
      'teknik@sirket.com',
      'saldirgan@evil.com',
      'gizli@evil.com'
    ]);
    // Hiçbir eleman CRLF, boşluk veya HTML etiketi içermemeli
    for (const email of cleaned) {
      assert.equal(/[\r\n<>]/.test(email), false);
    }
  });
});
