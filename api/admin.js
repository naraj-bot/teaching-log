// API จัดการบัญชีผู้ใช้ (ทำงานบน Vercel Serverless Function)
// ต้องตั้งค่า Environment Variables ใน Vercel:
//   FIREBASE_SERVICE_ACCOUNT  = เนื้อหาไฟล์ JSON ของ Service account ทั้งไฟล์
//   SUPERADMIN_EMAIL          = อีเมล Google ของแอดมินหลัก (หลายอีเมลคั่นด้วย ,)
//   USER_EMAIL_DOMAIN         = (ไม่บังคับ) ต้องตรงกับ userDomain ใน js/firebase-config.js
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const DOMAIN = (process.env.USER_EMAIL_DOMAIN || "teachlog.local").toLowerCase();
const USERNAME = /^[a-z0-9._-]{3,30}$/;

function adminApp() {
  if (!getApps().length) {
    let sa = {};
    try { sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}"); } catch (e) { sa = {}; }
    if (!sa.project_id) throw new Error("ยังไม่ได้ตั้งค่า FIREBASE_SERVICE_ACCOUNT ใน Vercel");
    initializeApp({ credential: cert(sa) });
  }
  return getApps()[0];
}
const fail = (res, code, error) => res.status(code).json({ ok: false, error });

export default async function handler(req, res) {
  if (req.method !== "POST") return fail(res, 405, "Method not allowed");
  let app;
  try { app = adminApp(); } catch (e) { return fail(res, 500, e.message); }
  const auth = getAuth(app), db = getFirestore(app), users = db.collection("users");

  const m = String(req.headers.authorization || "").match(/^Bearer (.+)$/);
  if (!m) return fail(res, 401, "ต้องเข้าสู่ระบบก่อน");
  let tok;
  try { tok = await auth.verifyIdToken(m[1], true); } catch (e) { return fail(res, 401, "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"); }

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const action = String(body.action || "");

  try {
    // ---- แอดมินหลักเข้าสู่ระบบด้วย Google ครั้งแรก
    if (action === "bootstrap") {
      const allowed = String(process.env.SUPERADMIN_EMAIL || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
      const email = String(tok.email || "").toLowerCase();
      const viaGoogle = tok.firebase && tok.firebase.sign_in_provider === "google.com";
      if (!viaGoogle || !tok.email_verified || !allowed.includes(email)) return fail(res, 403, "บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบ");
      const ref = users.doc(tok.uid);
      if (!(await ref.get()).exists) {
        await ref.set({ name: tok.name || "แอดมินหลัก", username: "", google: email, position: "ผู้ดูแลระบบ", role: "superadmin", active: true, createdAt: FieldValue.serverTimestamp() });
      }
      const st = db.doc("settings/public");
      if (!(await st.get()).exists) {
        await st.set({ school: "", credit: "พัฒนาระบบโดย ครูซอสสอนสังคม", termMode: "auto", t1Start: "05-16", t2Start: "11-01", currentTerm: "" });
      }
      return res.json({ ok: true });
    }

    // ---- คำสั่งอื่นต้องเป็นแอดมินโรงเรียนหรือแอดมินหลัก
    const me = (await users.doc(tok.uid).get()).data();
    if (!me || !me.active || !["admin", "superadmin"].includes(me.role)) return fail(res, 403, "ไม่มีสิทธิ์ทำรายการนี้");
    const sup = me.role === "superadmin";

    // ---- สร้างบัญชี (ทีละคน หรือหลายคนพร้อมกันไม่เกิน 10 คนต่อครั้ง)
    const createOne = async (x) => {
      const name = String(x.name || "").trim().slice(0, 80);
      const username = String(x.username || "").trim().toLowerCase();
      const password = String(x.password || "");
      const position = String(x.position || "").trim().slice(0, 80);
      const role = x.role === "admin" && sup ? "admin" : "teacher";
      if (!name) return { ok: false, status: 400, error: "กรอกชื่อ-นามสกุล" };
      if (!USERNAME.test(username)) return { ok: false, status: 400, error: "ชื่อผู้ใช้ใช้ a-z 0-9 . _ - ความยาว 3–30 ตัว" };
      if (password.length < 6) return { ok: false, status: 400, error: "รหัสผ่านอย่างน้อย 6 ตัว" };
      const dup = await users.where("username", "==", username).limit(1).get();
      if (!dup.empty) return { ok: false, status: 409, error: "ชื่อผู้ใช้นี้มีแล้ว" };
      try {
        const u = await auth.createUser({ email: `${username}@${DOMAIN}`, password, displayName: name });
        await users.doc(u.uid).set({ name, username, position, role, active: true, createdAt: FieldValue.serverTimestamp(), createdBy: tok.uid });
        return { ok: true, uid: u.uid };
      } catch (e) {
        const c = e && e.code || "";
        if (c === "auth/email-already-exists") return { ok: false, status: 409, error: "ชื่อผู้ใช้นี้มีแล้ว" };
        if (c === "auth/invalid-password") return { ok: false, status: 400, error: "รหัสผ่านอย่างน้อย 6 ตัว" };
        console.error(e);
        return { ok: false, status: 500, error: "สร้างไม่สำเร็จ ลองใหม่อีกครั้ง" };
      }
    };
    if (action === "create") {
      const r = await createOne(body);
      return r.ok ? res.json({ ok: true, uid: r.uid }) : fail(res, r.status, r.error);
    }
    if (action === "createMany") {
      const list = Array.isArray(body.list) ? body.list.slice(0, 10) : [];
      if (!list.length) return fail(res, 400, "ไม่มีรายชื่อ");
      const results = [];
      for (const x of list) { const r = await createOne(x); results.push({ ok: r.ok, uid: r.uid, error: r.error }); }
      return res.json({ ok: true, results });
    }

    const uid = String(body.uid || "");
    const target = uid ? (await users.doc(uid).get()).data() : null;
    const allowed = target && uid !== tok.uid && target.role !== "superadmin" && (target.role === "teacher" || sup);
    if (!allowed) return fail(res, 403, "ไม่มีสิทธิ์จัดการบัญชีนี้");

    if (action === "update") {
      const name = String(body.name || "").trim().slice(0, 80);
      const position = String(body.position || "").trim().slice(0, 80);
      const username = String(body.username || "").trim().toLowerCase();
      if (!name) return fail(res, 400, "กรอกชื่อ-นามสกุล");
      if (!USERNAME.test(username)) return fail(res, 400, "ชื่อผู้ใช้ใช้ a-z 0-9 . _ - ความยาว 3–30 ตัว");
      const patch = { name, position };
      if (username !== target.username) {
        const dup = await users.where("username", "==", username).limit(1).get();
        if (!dup.empty) return fail(res, 409, "ชื่อผู้ใช้นี้มีแล้ว");
        await auth.updateUser(uid, { email: `${username}@${DOMAIN}`, displayName: name });
        patch.username = username;
      } else {
        await auth.updateUser(uid, { displayName: name });
      }
      if (sup && ["admin", "teacher"].includes(body.role)) patch.role = body.role;
      await users.doc(uid).update(patch);
      return res.json({ ok: true });
    }
    if (action === "resetPassword") {
      const password = String(body.password || "");
      if (password.length < 6) return fail(res, 400, "รหัสผ่านอย่างน้อย 6 ตัว");
      await auth.updateUser(uid, { password });
      await auth.revokeRefreshTokens(uid);
      return res.json({ ok: true });
    }
    if (action === "setActive") {
      const on = !!body.active;
      await auth.updateUser(uid, { disabled: !on });
      if (!on) await auth.revokeRefreshTokens(uid);
      await users.doc(uid).update({ active: on });
      return res.json({ ok: true });
    }
    if (action === "setRole") {
      if (!sup) return fail(res, 403, "ไม่มีสิทธิ์ทำรายการนี้");
      await users.doc(uid).update({ role: body.role === "admin" ? "admin" : "teacher" });
      return res.json({ ok: true });
    }
    return fail(res, 400, "ไม่รู้จักคำสั่งนี้");
  } catch (e) {
    const c = e && e.code || "";
    if (c === "auth/email-already-exists") return fail(res, 409, "ชื่อผู้ใช้นี้มีแล้ว");
    if (c === "auth/invalid-password") return fail(res, 400, "รหัสผ่านอย่างน้อย 6 ตัว");
    console.error(e);
    return fail(res, 500, "ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
}
