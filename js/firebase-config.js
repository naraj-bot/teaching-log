// ค่าเชื่อมต่อ Firebase ของโปรเจกต์ teaching-log-watbangpoon
// ค่าเหล่านี้ไม่ใช่รหัสลับ เปิดเผยในหน้าเว็บได้ ความปลอดภัยของข้อมูลมาจาก firestore.rules
export const firebaseConfig = {
  apiKey: "AIzaSyBF2no9qxYd8fsbT1Tr9Q2FveiOT847mvk",
  authDomain: "teaching-log-watbangpoon.firebaseapp.com",
  projectId: "teaching-log-watbangpoon",
  storageBucket: "teaching-log-watbangpoon.firebasestorage.app",
  messagingSenderId: "146784665410",
  appId: "1:146784665410:web:d242c3cec3e4dcb9ea12db"
};

// โดเมนสมมติสำหรับแปลง "ชื่อผู้ใช้" เป็นบัญชีใน Firebase (ไม่มีการส่งอีเมลจริง)
// ต้องตรงกับค่า USER_EMAIL_DOMAIN ใน Vercel (ถ้าไม่ได้ตั้ง ใช้ค่านี้)
export const userDomain = "teachlog.local";
