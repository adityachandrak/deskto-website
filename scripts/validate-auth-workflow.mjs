const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const ADMIN_SIGNUP_CODE = "DESKTO-ADMIN-2026";

const db = {
  users: [],
  pendingSignup: null,
  resetRequest: null,
  sessions: [],
  auditLogs: [],
};

const results = [];

function assertStep(name, actual, expected) {
  const pass = actual === expected;
  results.push({ name, pass, actual, expected });
  if (!pass) {
    throw new Error(`${name}: expected "${expected}", received "${actual}"`);
  }
}

function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePhone(value) {
  return value.replace(/\D/g, "");
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function strongPassword(value) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
}

function hashPassword(value) {
  return `demo_bcrypt_${Buffer.from(value).toString("base64").slice(0, 28)}`;
}

function log(event, detail) {
  db.auditLogs.unshift({ event, detail, at: new Date().toISOString() });
}

function signup(input) {
  const phone = normalizePhone(input.phone || "");
  const role = input.role || "customer";
  if (!input.name?.trim()) return "EMPTY_NAME";
  if (!isEmail(input.email || "")) return "INVALID_EMAIL";
  if (phone.length < 10) return "INVALID_PHONE";
  if (!strongPassword(input.password || "")) return "WEAK_PASSWORD";
  if (input.password !== input.confirm) return "PASSWORD_MISMATCH";
  if (!input.terms) return "TERMS_REQUIRED";
  if (!["customer", "admin", "staff"].includes(role)) return "INVALID_ROLE";
  if (role === "admin" && input.adminCode !== ADMIN_SIGNUP_CODE) return "INVALID_ADMIN_CODE";
  if (role === "staff" && !/^STF-\d{4,}$/i.test(input.staffId || "")) return "INVALID_STAFF_ID";
  if (role === "staff" && !input.department?.trim()) return "DEPARTMENT_REQUIRED";
  if (db.users.some(user => user.email === input.email.toLowerCase())) return "DUPLICATE_EMAIL";
  if (db.users.some(user => user.phone === phone)) return "DUPLICATE_PHONE";
  if (role === "staff" && db.users.some(user => user.staffId === input.staffId.toUpperCase())) return "DUPLICATE_STAFF_ID";
  db.pendingSignup = {
    ...input,
    role,
    email: input.email.toLowerCase(),
    phone,
    staffId: role === "staff" ? input.staffId.toUpperCase() : undefined,
    department: role === "staff" ? input.department.trim() : undefined,
    passwordHash: hashPassword(input.password),
    otp: "123456",
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  };
  log("signup_otp_sent", input.email);
  return "OTP_SENT";
}

function verifySignupOtp(otp, now = Date.now()) {
  const pending = db.pendingSignup;
  if (!pending) return "NO_PENDING_SIGNUP";
  if (now > pending.expiresAt) return "EXPIRED_OTP";
  if (pending.attempts >= MAX_OTP_ATTEMPTS) return "OTP_ATTEMPTS_EXCEEDED";
  if (otp !== pending.otp) {
    pending.attempts += 1;
    return "WRONG_OTP";
  }
  const user = {
    id: id("usr"),
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    passwordHash: pending.passwordHash,
    role: pending.role,
    staffId: pending.staffId,
    department: pending.department,
    emailVerified: true,
    phoneVerified: true,
    status: "active",
    loginAttempts: 0,
  };
  db.users.push(user);
  db.sessions.push({ id: id("sess"), userId: user.id, token: id("refresh") });
  db.pendingSignup = null;
  log("signup_completed", user.email);
  return `${pending.role.toUpperCase()}_ACCOUNT_CREATED`;
}

function login(identifier, password) {
  const key = identifier.toLowerCase();
  const user = db.users.find(item => item.email === key || item.phone === normalizePhone(key));
  if (!user) return "USER_NOT_FOUND";
  if (user.status === "locked") return "ACCOUNT_LOCKED";
  if (user.passwordHash !== hashPassword(password)) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.status = "locked";
      return "ACCOUNT_LOCKED";
    }
    return "WRONG_PASSWORD";
  }
  if (!user.emailVerified) return "EMAIL_NOT_VERIFIED";
  user.loginAttempts = 0;
  db.sessions.push({ id: id("sess"), userId: user.id, token: id("refresh") });
  log("login_success", user.email);
  return "DASHBOARD";
}

function forgotPassword(email) {
  if (!db.users.some(user => user.email === email.toLowerCase())) return "USER_NOT_FOUND";
  db.resetRequest = {
    email: email.toLowerCase(),
    otp: "654321",
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
    verified: false,
  };
  log("reset_otp_sent", email);
  return "RESET_OTP_SENT";
}

function verifyResetOtp(otp, now = Date.now()) {
  const reset = db.resetRequest;
  if (!reset) return "NO_RESET_REQUEST";
  if (now > reset.expiresAt) return "EXPIRED_OTP";
  if (reset.attempts >= MAX_OTP_ATTEMPTS) return "OTP_ATTEMPTS_EXCEEDED";
  if (otp !== reset.otp) {
    reset.attempts += 1;
    return "WRONG_OTP";
  }
  reset.verified = true;
  return "RESET_OTP_VERIFIED";
}

function resetPassword(email, password, confirm) {
  const reset = db.resetRequest;
  const user = db.users.find(item => item.email === email.toLowerCase());
  if (!reset?.verified || reset.email !== email.toLowerCase()) return "OTP_NOT_VERIFIED";
  if (!strongPassword(password)) return "WEAK_PASSWORD";
  if (password !== confirm) return "PASSWORD_MISMATCH";
  user.passwordHash = hashPassword(password);
  db.sessions = db.sessions.filter(session => session.userId !== user.id);
  db.resetRequest = null;
  log("password_reset", email);
  return "RESET_SUCCESS";
}

const customer = {
  name: "Aditya Kumar",
  email: "aditya@example.com",
  phone: "9876543210",
  password: "Deskto@123",
  confirm: "Deskto@123",
  terms: true,
  role: "customer",
};

const admin = {
  ...customer,
  name: "Admin User",
  email: "admin@example.com",
  phone: "9876543211",
  role: "admin",
  adminCode: ADMIN_SIGNUP_CODE,
};

const staff = {
  ...customer,
  name: "Staff User",
  email: "staff@example.com",
  phone: "9876543212",
  role: "staff",
  staffId: "STF-1001",
  department: "Service",
};

assertStep("Empty name", signup({ ...customer, name: "" }), "EMPTY_NAME");
assertStep("Invalid email", signup({ ...customer, email: "bad-email" }), "INVALID_EMAIL");
assertStep("Weak password", signup({ ...customer, password: "weak", confirm: "weak" }), "WEAK_PASSWORD");
assertStep("Valid signup starts OTP", signup(customer), "OTP_SENT");
assertStep("Wrong OTP", verifySignupOtp("000000"), "WRONG_OTP");
assertStep("Expired OTP", verifySignupOtp("123456", Date.now() + OTP_TTL_MS + 1), "EXPIRED_OTP");
assertStep("Correct OTP creates customer account", verifySignupOtp("123456"), "CUSTOMER_ACCOUNT_CREATED");
assertStep("Invalid admin code", signup({ ...admin, email: "bad-admin@example.com", phone: "9876543213", adminCode: "WRONG" }), "INVALID_ADMIN_CODE");
assertStep("Valid admin signup starts OTP", signup(admin), "OTP_SENT");
assertStep("Correct OTP creates admin account", verifySignupOtp("123456"), "ADMIN_ACCOUNT_CREATED");
assertStep("Invalid staff ID", signup({ ...staff, email: "bad-staff@example.com", phone: "9876543214", staffId: "1001" }), "INVALID_STAFF_ID");
assertStep("Missing staff department", signup({ ...staff, email: "nodept@example.com", phone: "9876543215", department: "" }), "DEPARTMENT_REQUIRED");
assertStep("Valid staff signup starts OTP", signup(staff), "OTP_SENT");
assertStep("Correct OTP creates staff account", verifySignupOtp("123456"), "STAFF_ACCOUNT_CREATED");
assertStep("Duplicate email", signup({ ...customer, phone: "9876543211" }), "DUPLICATE_EMAIL");
assertStep("Duplicate phone", signup({ ...customer, email: "new@example.com" }), "DUPLICATE_PHONE");
assertStep("Wrong email login", login("missing@example.com", "Deskto@123"), "USER_NOT_FOUND");
assertStep("Wrong password login", login(customer.email, "Bad@1234"), "WRONG_PASSWORD");
assertStep("Correct login", login(customer.phone, "Deskto@123"), "DASHBOARD");
assertStep("Wrong reset email", forgotPassword("nobody@example.com"), "USER_NOT_FOUND");
assertStep("Reset OTP sent", forgotPassword(customer.email), "RESET_OTP_SENT");
assertStep("Wrong reset OTP", verifyResetOtp("111111"), "WRONG_OTP");
assertStep("Expired reset OTP", verifyResetOtp("654321", Date.now() + OTP_TTL_MS + 1), "EXPIRED_OTP");
assertStep("Correct reset OTP", verifyResetOtp("654321"), "RESET_OTP_VERIFIED");
assertStep("Reset success", resetPassword(customer.email, "NewDeskto@123", "NewDeskto@123"), "RESET_SUCCESS");
assertStep("Old password rejected", login(customer.email, "Deskto@123"), "WRONG_PASSWORD");
assertStep("New password accepted", login(customer.email, "NewDeskto@123"), "DASHBOARD");

console.table(results.map(({ name, pass, actual }) => ({ Step: name, Result: pass ? "PASS" : "FAIL", Actual: actual })));
console.log(`Validated ${results.length} authentication workflow steps.`);
