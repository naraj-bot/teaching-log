// สมุดบันทึกหลังสอน · พัฒนาระบบโดย ครูซอสสอนสังคม
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithEmailAndPassword, onAuthStateChanged, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, doc, collection, query, where, getDoc, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, userDomain } from "./firebase-config.js";

const CONFIGURED = !!(firebaseConfig && firebaseConfig.apiKey && !/^ใส่/.test(firebaseConfig.apiKey));
const fbApp = CONFIGURED ? initializeApp(firebaseConfig) : null;
const auth = CONFIGURED ? getAuth(fbApp) : null;
let db = null;
if (CONFIGURED) {
  try { db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
  catch (e) { db = getFirestore(fbApp); }
}

// เปิดจาก LINE: ให้เปิดในเบราว์เซอร์ปกติ (Google ไม่อนุญาตให้เข้าสู่ระบบในเบราว์เซอร์ของแอป)
const UA = navigator.userAgent || "";
if (/\bLine\//i.test(UA) && !/openExternalBrowser=1/.test(location.search)) location.replace(location.pathname + "?openExternalBrowser=1");

function fsMsg(e){ const c = (e && e.code) || "";
  if (c === "permission-denied") return "ไม่มีสิทธิ์ทำรายการนี้";
  if (c === "unavailable") return "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ข้อมูลจะส่งเมื่อกลับมาออนไลน์";
  if (c === "resource-exhausted") return "ใช้โควตา Firebase ของวันนี้หมดแล้ว ลองใหม่พรุ่งนี้";
  return "ทำรายการไม่สำเร็จ (" + (c || "ไม่ทราบสาเหตุ") + ")"; }
function authMsg(e){ const c = (e && e.code) || "";
  if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
  if (/user-disabled/.test(c)) return "บัญชีนี้ถูกปิดการใช้งาน ติดต่อแอดมินโรงเรียน";
  if (/too-many-requests/.test(c)) return "ลองเข้าสู่ระบบผิดหลายครั้ง รอสักครู่แล้วลองใหม่";
  if (/network-request-failed/.test(c)) return "เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง";
  if (/unauthorized-domain/.test(c)) return "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase (Authentication → Settings → Authorized domains)";
  if (/operation-not-allowed/.test(c)) return "ยังไม่ได้เปิดวิธีเข้าสู่ระบบนี้ใน Firebase";
  return "เข้าสู่ระบบไม่สำเร็จ (" + c + ")"; }
async function api(action, payload){
  const t = await auth.currentUser.getIdToken();
  let r; try { r = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + t }, body: JSON.stringify({ action, ...(payload || {}) }) }); }
  catch (e) { throw new Error("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง"); }
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (!r.ok || j.ok === false) throw new Error(j.error || ("ทำรายการไม่สำเร็จ (" + r.status + ")"));
  return j;
}

"use strict";
const $=id=>document.getElementById(id);
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const thd=s=>String(s??"").replace(/\d/g,d=>"๐๑๒๓๔๕๖๗๘๙"[d]);
const ICONS={
  logs:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6M9 9h2"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/><path d="M9 7h7"/>',
  layers:'<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
  track:'<path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-6"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.3a6.5 6.5 0 0 1 3.5 5.7"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  pdf:'<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v3h16v-3"/>',
  back:'<path d="M15 18 9 12l6-6"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  home:'<path d="M3 11 12 4l9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  logout:'<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4M19 12H9"/>',
  login:'<path d="M14 4h5v16h-5"/><path d="M9 8l4 4-4 4M13 12H3"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  check:'<path d="m5 12 5 5L20 7"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'
};
const ic=n=>`<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const logoHTML=()=>`<img src="img/logo.png" alt="" onerror="this.parentNode.classList.remove('has-img');this.remove()">${ic("book")}`;
["markSide","markTop"].forEach(id=>{$(id).classList.add("has-img");$(id).innerHTML=logoHTML()});$("sideOut").innerHTML=ic("logout");$("sideOut").onclick=()=>logout();

// ---------- dates & terms
const pad=n=>String(n).padStart(2,"0");
const isoOf=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const TODAY=isoOf(new Date());
const addDays=(s,n)=>{const d=new Date(s+"T00:00:00");d.setDate(d.getDate()+n);return isoOf(d)};
const weekday=s=>{const g=new Date(s+"T00:00:00").getDay();return g===0?addDays(s,-2):g===6?addDays(s,-1):s};
function acad(s){const d=new Date((s||TODAY)+"T00:00:00"),m=d.getMonth()+1,y=d.getFullYear();return (m>=5&&m<=10)?`1/${y+543}`:`2/${(m<=4?y-1:y)+543}`}
const prevTerm=t=>{let[a,y]=t.split("/").map(Number);return a===2?`1/${y}`:`2/${y-1}`};
const termCmp=(a,b)=>{const[x,y]=a.split("/").map(Number),[p,q]=b.split("/").map(Number);return (y-q)||(x-p)};
const MONTHS=["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
const MS=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
function dp(s){if(!s)return null;const d=new Date(s+"T00:00:00");if(isNaN(d))return null;return{d:d.getDate(),m:MONTHS[d.getMonth()],ms:MS[d.getMonth()],y:d.getFullYear()+543}}
const thaiDate=s=>{const p=dp(s);return p?`${p.d} ${p.m} ${p.y}`:""};
const shortDate=s=>{const p=dp(s);return p?`${p.d} ${p.ms} ${String(p.y).slice(2)}`:""};
function weekRange(s){const wd=(new Date(s+"T00:00:00").getDay()+6)%7,mon=addDays(s,-wd);return[mon,addDays(mon,6)]}
const fmtPct=v=>v==null?"–":(Math.round(v*100)/100).toLocaleString("th-TH",{maximumFractionDigits:2});
const pct=l=>{const t=+l.total||0;return t>0?(+l.pass||0)/t*100:null};

// ---------- sample data (fictional)
const GROUPS=["ภาษาไทย","คณิตศาสตร์","วิทยาศาสตร์และเทคโนโลยี","สังคมศึกษา ศาสนา และวัฒนธรรม","สุขศึกษาและพลศึกษา","ศิลปะ","การงานอาชีพ","ภาษาต่างประเทศ","กิจกรรมพัฒนาผู้เรียน"];
const LEVELS=["อนุบาล","ประถมศึกษา","มัธยมศึกษา"];
const ROLE={superadmin:"แอดมินหลัก",admin:"แอดมินโรงเรียน",teacher:"ครูผู้สอน"};
const CUR=acad(TODAY);
// live cache filled from Firestore
const D={settings:{school:"",credit:"พัฒนาระบบโดย ครูซอสสอนสังคม",termMode:"auto",t1Start:"05-16",t2Start:"11-01",currentTerm:CUR},users:[],assigns:[],logs:[],reviews:{}};
function autoTerm(iso){const st=D.settings,y=+iso.slice(0,4),md=iso.slice(5);
  if(md>=st.t1Start&&md<st.t2Start)return `1/${y+543}`;if(md>=st.t2Start)return `2/${y+543}`;return `2/${y+542}`}
function curTerm(){return D.settings.termMode==="auto"?autoTerm(TODAY):D.settings.currentTerm}

// ---------- รายวิชาของโรงเรียน (ตามโครงสร้างหลักสูตรที่โรงเรียนส่งมา)
const GROUP_OF={"ท":"ภาษาไทย","ค":"คณิตศาสตร์","ว":"วิทยาศาสตร์และเทคโนโลยี","ส":"สังคมศึกษา ศาสนา และวัฒนธรรม","พ":"สุขศึกษาและพลศึกษา","ศ":"ศิลปะ","ง":"การงานอาชีพ","อ":"ภาษาต่างประเทศ"};
const GRADES=["อ.1","อ.2","อ.3","ป.1","ป.2","ป.3","ป.4","ป.5","ป.6","ม.1","ม.2","ม.3"];
const levelOfGrade=g=>/^อ/.test(g)?"อนุบาล":/^ป/.test(g)?"ประถมศึกษา":"มัธยมศึกษา";
const credit=h=>(Math.round((+h||0)/40*10)/10).toFixed(1);
const courseSort=(a,b)=>((a.order??9999)-(b.order??9999))||String(a.code||"").localeCompare(String(b.code||""));
function buildCourseSeed(){
  const out=[],add=(grade,sem,code,name,hours,type)=>out.push({grade,sem,code,name,hours,type,group:type==="กิจกรรม"?"กิจกรรมพัฒนาผู้เรียน":(GROUP_OF[code[0]]||""),level:levelOfGrade(grade),order:out.length});
  for(let g=1;g<=6;g++){const G="ป."+g,lo=g<=3;
    [["ท","101","ภาษาไทย",lo?200:160],["ค","101","คณิตศาสตร์",lo?200:160],["ว","101","วิทยาศาสตร์และเทคโนโลยี",80],["ส","101","สังคมศึกษา ศาสนาและวัฒนธรรม",lo?40:80],["ส","102","ประวัติศาสตร์",40],
     ["พ","101","สุขศึกษาและพลศึกษา",lo?40:80],["ศ","101","ศิลปะ",80],["ง","101","การงานอาชีพ",lo?40:80],["อ","101","ภาษาอังกฤษ",lo?120:80],
     ["ส",String(230+g),"หน้าที่พลเมือง",40],["ส","201","การป้องกันการทุจริต",40],...(lo?[["อ","201","อังกฤษอ่าน-เขียน",80]]:[]),["ว","201","เทคโนโลยี (วิทยาการคำนวณ)",40]]
      .forEach(([p,t,nm,h])=>add(G,"1,2",`${p}1${g}${t}`,`${nm} ${g}`,h,t[0]==="1"?"พื้นฐาน":"เพิ่มเติม"));
    [["กิจกรรมแนะแนว",40],["ลูกเสือ-เนตรนารี",40],["ชุมนุม",30],["กิจกรรมเพื่อสังคมและสาธารณประโยชน์",10]].forEach(([nm,h])=>add(G,"1,2","",nm,h,"กิจกรรม"));
  }
  for(let g=1;g<=3;g++)for(let s=1;s<=2;s++){const n=(g-1)*2+s,G="ม."+g,S1=String(s);
    [["ท",`2${g}10${s}`,"ภาษาไทย",60],["ค",`2${g}10${s}`,"คณิตศาสตร์",60],["ค",`2${g}20${s}`,"เสริมทักษะคณิตศาสตร์",20],["ว",`2${g}10${s}`,"วิทยาศาสตร์และเทคโนโลยี",60],["ว",`2${g}20${s}`,"การออกแบบและเทคโนโลยี",40],
     ["ส",`2${g}10${s}`,"สังคมศึกษา ศาสนาและวัฒนธรรม",60],["ส",`2${g}10${s+2}`,"ประวัติศาสตร์",20],["ส",`2${g}2${30+n}`,"หน้าที่พลเมือง",20],["ส",`2${g}20${s}`,"การป้องกันการทุจริต",20],
     ["พ",`2${g}10${s}`,"สุขศึกษาและพลศึกษา",40],["ศ",`2${g}10${s}`,"ศิลปะ",40],["ศ",`2${g}20${s}`,"นาฏศิลป์พื้นบ้าน",20],["ง",`2${g}10${s}`,"การงานอาชีพ",40],["อ",`2${g}10${s}`,"ภาษาอังกฤษ",60]]
      .forEach(([p,c,nm,h])=>add(G,S1,p+c,`${nm} ${n}`,h,c[2]==="1"?"พื้นฐาน":"เพิ่มเติม"));
    (s===1?[["กิจกรรมแนะแนว",20],["ลูกเสือ-เนตรนารี",20],["ชุมนุมส่งเสริมวิชาการ",13],["กิจกรรมสังคมและสาธารณประโยชน์",7]]
          :[["กิจกรรมแนะแนว",20],["ลูกเสือ-เนตรนารี",20],["ชุมนุมส่งเสริมวิชาการ",12],["กิจกรรมเพื่อสังคมและสาธารณประโยชน์",8]]).forEach(([nm,h])=>add(G,S1,"",nm,h,"กิจกรรม"));
  }
  return out;
}
function courseSave(c){const{id,...d}=c;(id?updateDoc(doc(db,"courses",id),d):addDoc(collection(db,"courses"),d)).then(()=>toast("บันทึกรายวิชาแล้ว")).catch(e=>toast(fsMsg(e)))}
function courseDel(id){deleteDoc(doc(db,"courses",id)).then(()=>toast("ลบรายวิชาแล้ว")).catch(e=>toast(fsMsg(e)))}
async function courseSeed(){const all=buildCourseSeed();try{for(let i=0;i<all.length;i+=400){const b=writeBatch(db);all.slice(i,i+400).forEach(c=>b.set(doc(collection(db,"courses")),c));await b.commit()}toast("นำเข้ารายวิชาแล้ว "+all.length+" รายการ")}catch(e){toast(fsMsg(e))}}
function asgAdd(list){const b=writeBatch(db);list.forEach(a=>b.set(doc(collection(db,"assigns")),a));b.commit().then(()=>toast("เพิ่มวิชาแล้ว "+list.length+" วิชา")).catch(e=>toast(fsMsg(e)))}
D.courses=[];
function nextChange(){const st=D.settings,y=+TODAY.slice(0,4);const d=[`${y}-${st.t1Start}`,`${y}-${st.t2Start}`,`${y+1}-${st.t1Start}`].find(x=>x>TODAY);return{date:d,term:autoTerm(d)}}

// ---------- รอบการส่งบันทึก (แอดมินโรงเรียนกำหนด)
const WD=["จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์","อาทิตย์"];
const FREQ={week:"ทุกสัปดาห์","2week":"ทุก 2 สัปดาห์",month:"ทุกเดือน"};
function termStartOf(iso){const st=D.settings,y=+iso.slice(0,4),md=iso.slice(5);if(md>=st.t1Start&&md<st.t2Start)return `${y}-${st.t1Start}`;if(md>=st.t2Start)return `${y}-${st.t2Start}`;return `${y-1}-${st.t2Start}`}
function cycleOf(iso){const s=D.settings,f=s.dueFreq||"week",dd=Math.min(7,Math.max(1,+(s.dueDay||5)));
  if(f==="month"){const y=+iso.slice(0,4),mo=+iso.slice(5,7),last=new Date(y,mo,0).getDate(),from=`${y}-${pad(mo)}-01`,to=`${y}-${pad(mo)}-${pad(last)}`;
    return{from,to,due:to,label:`เดือน${MONTHS[mo-1]}`}}
  const[mon]=weekRange(iso);
  if(f==="2week"){const[a]=weekRange(termStartOf(iso)),k=Math.max(0,Math.floor((new Date(mon)-new Date(a))/864e5/14)),from=addDays(a,k*14),to=addDays(from,13);
    return{from,to,due:addDays(from,7+dd-1),label:`รอบ ${shortDate(from)} – ${shortDate(to)}`}}
  return{from:mon,to:addDays(mon,6),due:addDays(mon,dd-1),label:`สัปดาห์ ${shortDate(mon)} – ${shortDate(addDays(mon,6))}`};
}
const prevCycle=c=>cycleOf(addDays(c.from,-1));
const dueTxt=c=>`วัน${WD[(new Date(c.due+"T00:00:00").getDay()+6)%7]}ที่ ${shortDate(c.due)}`;
function dueStatus(n,c){const min=Math.max(1,+(D.settings.dueMin||1));
  if(n>=min)return{k:"good",t:`ส่งแล้ว ${n}`};
  if(TODAY>c.due)return{k:"bad",t:n?`ส่ง ${n}/${min} · เลยกำหนด`:"เลยกำหนด"};
  return{k:"wait",t:n?`ส่ง ${n}/${min}`:"ยังไม่ส่ง"}}
function persistSettings(p,msg){saveSettings(p,msg)}

// ---------- state
const S={np:{grade:"",sel:new Set(),rooms:new Set()},cg:"ม.1",ce:null,sg:{teacher:"",sel:new Set()},pwNote:"",screen:"boot",me:null,meDoc:null,loginErr:"",term:null,view:"home",back:"home",doc:null,editId:null,w:{assign:null},
  f:{teacher:"",assign:"",unit:"",cls:"",status:"",q:""},b:{teacher:"",assign:""},tr:{period:"cycle",group:""},sub:{teacher:""}};
const DL={save:async({filename,data})=>{const blob=data instanceof Blob?data:new Blob([data],{type:/\.csv$/.test(filename)?"text/csv;charset=utf-8":"application/octet-stream"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000);return{status:"saved"}}};
const me=()=>S.meDoc||{id:null,role:"none",name:"",position:""};
const ini=n=>(String(n).replace(/^(นางสาว|นาย|นาง)/,"").replace(/^(ครู|แอดมิน)/,"").trim().charAt(0)||"?");
const isAdmin=()=>["admin","superadmin"].includes(me().role);
const isSuper=()=>me().role==="superadmin";
const isCur=()=>S.term===curTerm();
const user=id=>(S.meDoc&&S.meDoc.id===id?S.meDoc:D.users.find(u=>u.id===id))||{name:"—"};
const reviewed=id=>!!(D.reviews[id]&&D.reviews[id].comment);
const myAssigns=(tid,term)=>D.assigns.filter(a=>a.teacherId===tid&&a.term===term);
function toast(m){const t=$("toast");t.textContent=m;t.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>t.hidden=true,3200)}

// ---------- navigation
const NAV=[
  {id:"home",label:"หน้าหลัก",short:"หน้าหลัก",icon:"home"},
  {id:"sign",label:"ลงนามบันทึก",short:"ลงนาม",icon:"pen",admin:true},
  {id:"logs",label:"บันทึกหลังสอน",short:"บันทึก",icon:"logs"},
  {id:"track",label:"ติดตามการส่ง",short:"ติดตาม",icon:"track",admin:true},
  {id:"write",label:"เขียนบันทึก",short:"เขียน",icon:"plus",fab:true},
  {id:"binder",label:"รวมเล่ม",short:"รวมเล่ม",icon:"book"},
  {id:"subjects",label:"วิชาที่สอน",short:"วิชา",icon:"layers"},
  {id:"people",label:"ครูและผู้ดูแล",short:"บุคลากร",icon:"users",admin:true},
  {id:"courses",label:"รายวิชาของโรงเรียน",short:"รายวิชา",icon:"grid",admin:true},
  {id:"settings",label:"ตั้งค่าโรงเรียน",short:"ตั้งค่า",icon:"gear",admin:true},
  {id:"account",label:"บัญชีของฉัน",short:"บัญชี",icon:"user"}];
const TITLES={courses:"รายวิชาของโรงเรียน",sign:"ลงนามบันทึก",home:"หน้าหลัก",logs:"บันทึกหลังสอน",track:"ติดตามการส่ง",write:"เขียนบันทึก",binder:"รวมเล่ม",subjects:"วิชาที่สอน",people:"ครูและผู้ดูแล",settings:"ตั้งค่าโรงเรียน",account:"บัญชีของฉัน",doc:"บันทึกหลังสอน"};
const navItems=()=>NAV.filter(n=>!n.admin||isAdmin());
const activeTab=()=>S.view==="doc"?S.back:S.view;
function pendingCount(){if(!isAdmin())return 0;return D.logs.filter(l=>l.term===S.term&&!reviewed(l.id)).length}
function renderNav(){
  const a=activeTab(),pc=pendingCount();
  const MANAGE=["people","courses","settings"],sbtn=n=>`<button class="navbtn${n.fab?" write":""}" data-go="${n.id}"${a===n.id?' aria-current="page"':""}>${ic(n.icon)}<span>${n.label}</span>${n.id==="sign"&&pc?`<span class="cnt">${pc}</span>`:""}</button>`;
  const sItems=navItems().filter(n=>n.id!=="account"),sMain=sItems.filter(n=>!MANAGE.includes(n.id)),sMan=sItems.filter(n=>MANAGE.includes(n.id));
  const manAct=sMan.some(n=>n.id===a),manOpen=manAct||LS.get("plog.navopen")==="1";
  $("sideNav").innerHTML=sMain.map(sbtn).join("")+(sMan.length?`<button class="navgroup${manAct?" has-active":""}" id="navGrp" aria-expanded="false">${ic("gear")}<span>จัดการระบบ</span><svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>`:"");
  $("navFly").innerHTML=`<div class="fh">จัดการระบบ</div>`+sMan.map(sbtn).join("");$("navFly").hidden=true;
  $("navGrp")&&($("navGrp").onclick=e=>{e.stopPropagation();const f=$("navFly");if(!f.hidden){f.hidden=true;$("navGrp").setAttribute("aria-expanded","false");return}
    f.hidden=false;const r=$("navGrp").getBoundingClientRect(),fh=f.offsetHeight,top=Math.max(8,Math.min(r.top-6,innerHeight-fh-12));
    f.style.left=($("side").getBoundingClientRect().right+10)+"px";f.style.top=top+"px";f.style.setProperty("--ay",(r.top-top+r.height/2-6)+"px");$("navGrp").setAttribute("aria-expanded","true")});
  $("meBtn").toggleAttribute("aria-current",a==="account");
  const items=navItems(),fab=items.find(n=>n.fab),rest=items.filter(n=>!n.fab);
  let bar,extra=[];
  if(rest.length<=4)bar=[rest[0],rest[1],fab,rest[2],rest[3]].filter(Boolean);
  else{bar=[rest[0],rest[1],fab,rest[2],{id:"_more",short:"เมนู",icon:"menu"}];extra=rest.slice(3)}
  $("bnav").style.gridTemplateColumns=`repeat(${bar.length},1fr)`;
  $("bnav").innerHTML=bar.map(n=>n.fab
    ?`<button class="fab" data-go="write"${a==="write"?' aria-current="page"':""} aria-label="เขียนบันทึก"><span class="c">${ic("plus")}</span><span>${n.short}</span></button>`
    :`<button data-go="${n.id}"${a===n.id||(n.id==="_more"&&extra.some(e=>e.id===a))?' aria-current="page"':""}>${ic(n.icon)}<span>${n.short}</span>${n.id==="sign"&&pc?`<span class="dot">${pc}</span>`:""}</button>`).join("");
  $("moreList").innerHTML=`<div class="mhead"><b>เมนูเพิ่มเติม</b><button class="x2" id="moreX" aria-label="ปิดเมนู">${ic("x")}</button></div>`+extra.map(n=>`<button class="item" data-go="${n.id}">${ic(n.icon)}${n.label}</button>`).join("")+`<button class="item" id="moreOut">${ic("logout")}ออกจากระบบ</button>`;
  $("moreX").onclick=()=>$("more").hidden=true;$("moreOut").onclick=()=>{$("more").hidden=true;logout()};
  const u=me();$("meAv").textContent=ini(u.name);$("meName").textContent=u.name;$("meRole").textContent=u.position||ROLE[u.role];
  $("schoolSide").textContent=D.settings.school;$("creditSide").textContent=D.settings.credit;
}
function renderTermSel(){
  const terms=[...new Set([curTerm(),...D.assigns.map(a=>a.term),...D.logs.map(l=>l.term)])].sort(termCmp);
  $("termSel").innerHTML=terms.map(t=>`<option value="${t}"${t===S.term?" selected":""}>${t}${t===curTerm()?" (ปัจจุบัน)":""}</option>`).join("");
}
function go(v){
  if(v!=="people")S.pwNote="";
  if(v==="_more"){$("more").hidden=false;return}
  $("more").hidden=true;
  if(v==="write"&&!go.keep){S.editId=null;S.w={assign:null,cls:null}}go.keep=false;
  if(v!=="doc")S.back=v==="write"?S.back:v;
  S.view=v;render();window.scrollTo(0,0);
}
document.addEventListener("click",e=>{
  if(!e.target.closest("#navFly")&&!e.target.closest("#navGrp")&&$("navFly")&&!$("navFly").hidden){$("navFly").hidden=true;$("navGrp")&&$("navGrp").setAttribute("aria-expanded","false")}
  const g=e.target.closest("[data-go]");if(g){go(g.dataset.go);return}
  const o=e.target.closest("[data-open]");if(o){openDoc(o.dataset.open);return}
  if(e.target.id==="more")$("more").hidden=true;
});
$("termSel").addEventListener("change",()=>{setTerm($("termSel").value);S.f={teacher:S.f.teacher,assign:"",unit:"",cls:"",status:"",q:""};S.b.assign="";if(S.view==="write"||S.view==="doc")S.view=S.back;render()});
function resetUI(){S.view="home";S.back="home";S.f={teacher:"",assign:"",unit:"",cls:"",status:"",q:""};S.b={teacher:"",assign:""};S.sub.teacher="";S.w={assign:null,cls:null};S.sg={teacher:"",sel:new Set()};S.pwNote=""}
async function logout(){S.loginErr="";try{await signOut(auth)}catch(e){}}

// ---------- render dispatcher
function render(){
  document.body.classList.toggle("gated",S.screen!=="app");$("gate").hidden=S.screen==="app";$("boot").hidden=true;
  if(S.screen!=="app"){renderGate();return}
  renderNav();renderTermSel();
  $("pageTitle").textContent=TITLES[S.view];
  $("pageSub").textContent=D.settings.school+" · "+(isCur()?"ภาคเรียนปัจจุบัน":"ภาคเรียนที่ผ่านมา (ดูอย่างเดียว)");
  const m=$("main");
  if(S.screen==="boot")return;
  ({courses:vCourses,sign:vSign,home:vHome,logs:vLogs,track:vTrack,write:vWrite,binder:vBinder,subjects:vSubjects,people:vPeople,settings:vSettings,account:vAccount,doc:vDoc})[S.view](m);
  fitSheets();
}
const oldBanner=()=>isCur()?"":`<div class="banner">${ic("info")}<div>กำลังดู<b>ภาคเรียนที่ ${esc(S.term)}</b> ซึ่งเป็นภาคเรียนที่ผ่านมา เปิดดูและดาวน์โหลดได้ตลอด แต่แก้ไขไม่ได้ ภาคเรียนปัจจุบันคือ ${esc(curTerm())}</div></div>`;

// ---------- view: logs
function scopeLogs(){return D.logs.filter(l=>l.term===S.term&&(isAdmin()||l.authorId===S.me))}
function itemHTML(l,showTeacher){
  const p=pct(l),d=dp(l.date);
  return `<button class="item" data-open="${l.id}"><div class="d"><b>${d?d.d+" "+d.ms:"–"}</b>${d?d.y:""}</div>
  <div style="min-width:0"><div class="t">${esc(l.code?l.code+" ":"")}${esc(l.subject)} · ${esc(l.cls)}</div>
  <div class="s">หน่วยที่ ${esc(l.unitNo)} · แผนที่ ${esc(l.planNo)} ${esc(l.topic)}</div>${showTeacher?`<div class="s">${esc(l.teacher)}</div>`:""}</div>
  <div class="c">${p==null?"":`<span class="chip ${p>=70?"good":"bad"}">ผ่าน ${fmtPct(p)}%</span>`}<span class="chip ${reviewed(l.id)?"good":"wait"}">${reviewed(l.id)?"ลงนามแล้ว":"รอลงนาม"}</span></div></button>`;
}
function vLogs(m){
  const base=scopeLogs(),f=S.f;
  const teachers=[...new Set(base.map(l=>l.authorId))].map(user).sort((a,b)=>a.name.localeCompare(b.name,"th"));
  const pool=base.filter(l=>!f.teacher||l.authorId===f.teacher);
  const asg=[...new Map(pool.map(l=>[l.assignId,l])).values()];
  const units=[...new Map(pool.filter(l=>!f.assign||l.assignId===f.assign).map(l=>[l.unitNo,l])).values()].sort((a,b)=>a.unitNo-b.unitNo);
  const classes=[...new Set(pool.map(l=>l.cls))].sort((a,b)=>a.localeCompare(b,"th",{numeric:true}));
  const rows=pool.filter(l=>(!f.assign||l.assignId===f.assign)&&(!f.unit||l.unitNo===f.unit)&&(!f.cls||l.cls===f.cls)&&(!f.status||(f.status==="done")===reviewed(l.id))
    &&(!f.q||[l.subject,l.code,l.topic,l.unitName,l.teacher,l.cls].join(" ").toLowerCase().includes(f.q.toLowerCase()))).sort((a,b)=>b.date.localeCompare(a.date)||b.planNo-a.planNo);
  const ps=rows.map(pct).filter(v=>v!=null);
  m.innerHTML=`${oldBanner()}
  <div class="card gold"><div class="grid-f">
    <label class="f wide">ค้นหา<input id="fq" type="search" value="${esc(f.q)}" placeholder="วิชา เรื่อง หน่วย หรือชื่อครู"></label>
    ${isAdmin()?`<label class="f">ครูผู้สอน<select id="ft"><option value="">ครูทุกคน</option>${teachers.map(u=>`<option value="${u.id}"${f.teacher===u.id?" selected":""}>${esc(u.name)}</option>`).join("")}</select></label>`:""}
    <label class="f">วิชา<select id="fa"><option value="">ทุกวิชา</option>${asg.map(l=>`<option value="${l.assignId}"${f.assign===l.assignId?" selected":""}>${esc((l.code?l.code+" ":"")+l.subject)}</option>`).join("")}</select></label>
    <label class="f">หน่วย<select id="fu"><option value="">ทุกหน่วย</option>${units.map(l=>`<option value="${esc(l.unitNo)}"${f.unit===l.unitNo?" selected":""}>หน่วยที่ ${esc(l.unitNo)} ${esc(l.unitName)}</option>`).join("")}</select></label>
    <label class="f">ชั้น/ห้อง<select id="fc"><option value="">ทุกห้อง</option>${classes.map(c=>`<option${f.cls===c?" selected":""}>${esc(c)}</option>`).join("")}</select></label>
    <label class="f">สถานะ<select id="fs"><option value="">ทุกสถานะ</option><option value="wait"${f.status==="wait"?" selected":""}>รอลงนาม</option><option value="done"${f.status==="done"?" selected":""}>ลงนามแล้ว</option></select></label>
  </div></div>
  <div class="tiles"><div><b>${rows.length}</b><span>บันทึก</span></div><div><b>${ps.length?fmtPct(ps.reduce((a,b)=>a+b,0)/ps.length):"–"}</b><span>ร้อยละผ่านเฉลี่ย</span></div>
    <div><b>${rows.filter(l=>!reviewed(l.id)).length}</b><span>รอลงนาม</span></div><div><b>${new Set(rows.map(l=>l.assignId+"|"+l.unitNo)).size}</b><span>หน่วยการเรียนรู้</span></div></div>
  <div class="sec-h"><h2>เรียงตามวันที่ล่าสุด</h2><span class="sp"></span>
    ${rows.length?`<button class="btn sm" id="pdfList">${ic("eye")}PDF รายการนี้</button>`:""}${rows.length&&DL?`<button class="btn sm ghost" id="csvList">CSV</button>`:""}</div>
  <div class="list">${rows.length?rows.map(l=>itemHTML(l,isAdmin())).join(""):`<div class="empty"><h3>${base.length?"ไม่พบบันทึกตามตัวกรอง":"ยังไม่มีบันทึกในภาคเรียนนี้"}</h3><p>${base.length?"ลองล้างคำค้นหาหรือเปลี่ยนตัวกรอง":"บันทึกที่เขียนแล้วจะขึ้นที่นี่ เรียงตามวันที่สอน"}</p>${!base.length&&isCur()?`<button class="btn primary" data-go="write">${ic("plus")}เขียนบันทึก</button>`:""}</div>`}</div>`;
  const bind=(id,k,reset)=>{$(id)&&$(id).addEventListener(id==="fq"?"input":"change",e=>{S.f[k]=e.target.value;(reset||[]).forEach(r=>S.f[r]="");if(id==="fq"){clearTimeout(bind.t);bind.t=setTimeout(()=>{render();const q=$("fq");q.focus();q.setSelectionRange(q.value.length,q.value.length)},250)}else render()})};
  bind("fq","q");bind("ft","teacher",["assign","unit"]);bind("fa","assign",["unit"]);bind("fu","unit");bind("fc","cls");bind("fs","status");
  $("pdfList")&&($("pdfList").onclick=()=>makePdf(rows.slice().sort((a,b)=>a.date.localeCompare(b.date)),"บันทึกหลังสอน_"+S.term.replace("/","-")));
  $("csvList")&&($("csvList").onclick=()=>csvLogs(rows));
}

// ---------- view: document
function openDoc(id){S.doc=id;if(S.view!=="doc")S.back=activeTab();S.view="doc";render();window.scrollTo(0,0)}
const QUICK=["รับทราบ เป็นไปตามแผนการจัดการเรียนรู้","ดีมาก ควรนำไปเผยแพร่เป็นแบบอย่าง","ให้ติดตามนักเรียนที่ไม่ผ่านการประเมินเพื่อสอนซ่อมเสริม","ควรปรับกิจกรรมให้เหมาะสมกับเวลา"];
const signPos=u=>u.position+(/ผู้อำนวยการ/.test(u.position)?D.settings.school:"");
function signBox(idp,initial){const u=me();
  return `<div class="chips">${QUICK.map((q,i)=>`<button type="button" class="qc" data-q="${i}">${esc(q)}</button>`).join("")}</div>
  <textarea id="${idp}C" rows="3" maxlength="2000" placeholder="ความคิดเห็น / ข้อเสนอแนะ" aria-label="ความคิดเห็น">${esc(initial||"")}</textarea>
  <div class="sigrow">${u.sig?`<img src="${u.sig}" alt="ลายเซ็นของฉัน"><div><b>${esc(u.name)}</b><small>${esc(signPos(u))}</small></div>`
    :`<div><b>${esc(u.name)}</b><small>ยังไม่มีลายเซ็น จะลงเป็นชื่อในวงเล็บ · </small><button type="button" class="btn sm ghost" data-go="account" style="min-height:0;padding:0">วาดลายเซ็น</button></div>`}</div>`}
function bindQuick(root,ta){root.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{ta.value=QUICK[+b.dataset.q];ta.focus()})}
function doSign(ids,c){const u=me(),b=writeBatch(db);ids.forEach(id=>{const l=D.logs.find(x=>x.id===id);b.set(doc(db,"reviews",id),{comment:c,name:u.name,pos:signPos(u),date:TODAY,by:u.id,term:l?l.term:S.term,updatedAt:serverTimestamp()})});
  b.commit().catch(e=>toast(fsMsg(e)))}
function vDoc(m){
  const l=D.logs.find(x=>x.id===S.doc);
  if(!l){m.innerHTML=`<div class="empty"><h3>ไม่พบบันทึกนี้</h3><button class="btn" data-go="${S.back}">กลับ</button></div>`;return}
  const r=D.reviews[l.id]||{},mine=l.authorId===S.me,canEdit=mine&&l.term===curTerm(),done=reviewed(l.id);
  const panel=isAdmin()?`<form class="card gold stack signpanel" id="signForm"><h2>${done?"ความคิดเห็นของผู้บริหาร":"ลงความเห็นและลงนาม"}</h2>
    <p class="muted" style="margin:0;font-size:.88rem">${done?`ลงนามแล้วโดย ${esc(r.name)} เมื่อ ${esc(shortDate(r.date))} แก้ไขได้`:"เลือกข้อความสำเร็จรูปหรือพิมพ์เอง เมื่อกดลงนาม ความเห็นและลายเซ็นจะไปอยู่ท้ายเอกสาร"}</p>
    ${signBox("sg",r.comment)}<button class="btn primary" type="submit">${ic("pen")}${done?"บันทึกการแก้ไข":"ลงนาม"}</button></form>`:"";
  m.innerHTML=`<div class="row2"><button class="btn ghost" data-go="${S.back}">${ic("back")}กลับ</button><span class="sp"></span>
    <span class="chip ${done?"good":"wait"}">${done?"ลงนามแล้ว":"รอลงนาม"}</span>
    <button class="btn gold" id="pdfOne">${ic("eye")}ดูตัวอย่าง / PDF</button>
    ${canEdit?`<button class="btn" id="editOne">${ic("edit")}แก้ไข</button><button class="btn danger" id="delOne" aria-label="ลบ">${ic("trash")}</button>`:""}</div>
  <div class="confirm" id="delBox" hidden><span>ลบบันทึกนี้ถาวร? กู้คืนไม่ได้</span><button class="btn danger sm" id="delYes">ลบเลย</button><button class="btn sm" id="delNo">ไม่ลบ</button></div>
  <div class="docgrid">${panel}<div class="sheetstack">${sheetPages(l).map(h=>`<div class="sheetfit">${h}</div>`).join("")}</div></div>`;
  $("pdfOne").onclick=()=>makePdf([l],fileBase(l));
  if(canEdit){$("editOne").onclick=()=>{S.editId=l.id;S.w={assign:l.assignId,cls:null};S.view="write";render();window.scrollTo(0,0)};
    $("delOne").onclick=()=>$("delBox").hidden=false;$("delNo").onclick=()=>$("delBox").hidden=true;
    $("delYes").onclick=()=>{const b=writeBatch(db);b.delete(doc(db,"logs",l.id));b.delete(doc(db,"reviews",l.id));b.commit().then(()=>toast("ลบบันทึกแล้ว")).catch(e=>toast(fsMsg(e)));go(S.back)}}
  if(isAdmin()){const f=$("signForm");bindQuick(f,$("sgC"));f.addEventListener("submit",e=>{e.preventDefault();const c=$("sgC").value.trim();if(!c){toast("เขียนความคิดเห็นก่อนลงนาม");$("sgC").focus();return}
    doSign([l.id],c);toast("ลงนามแล้ว");render()})}
}
// ---------- view: batch sign (admin)
function vSign(m){
  if(!isAdmin()){go("home");return}
  const all=D.logs.filter(l=>l.term===S.term&&!reviewed(l.id));
  const tchs=[...new Set(all.map(l=>l.authorId))].map(user).sort((a,b)=>a.name.localeCompare(b.name,"th"));
  const rows=all.filter(l=>!S.sg.teacher||l.authorId===S.sg.teacher).sort((a,b)=>a.date.localeCompare(b.date));
  S.sg.sel=new Set([...S.sg.sel].filter(id=>rows.some(l=>l.id===id)));
  m.innerHTML=`${oldBanner()}<div class="banner">${ic("info")}<div>ผู้อำนวยการหรือผู้ที่ได้รับมอบหมายลงนามได้ 2 วิธี: เลือกหลายฉบับในหน้านี้แล้วลงนามพร้อมกัน หรือกด "ดู" เพื่อเปิดเอกสารแล้วลงนามข้างเอกสารทีละฉบับ</div></div>
  <div class="docgrid">
    <form class="card gold stack signpanel" id="bsForm"><h2>ลงนามรายการที่เลือก</h2>${signBox("bs","")}
      <button class="btn primary" type="submit" id="bsBtn">${ic("pen")}ลงนาม <span id="bsN">0</span> รายการ</button></form>
    <div class="stack" style="min-width:0">
      <div class="card"><label class="f">ครูผู้สอน<select id="sgT"><option value="">ครูทุกคน (${all.length} รายการรอลงนาม)</option>${tchs.map(u=>`<option value="${u.id}"${S.sg.teacher===u.id?" selected":""}>${esc(u.name)} (${all.filter(l=>l.authorId===u.id).length})</option>`).join("")}</select></label></div>
      <div class="list">${rows.length?`<label class="selall"><input type="checkbox" id="selAll" style="width:20px;height:20px;min-height:0"> เลือกทั้งหมด ${rows.length} รายการ</label>`+rows.map(l=>{const p=pct(l),d=dp(l.date);return `<div class="item srow">
        <label class="check"><input type="checkbox" data-sel="${l.id}"${S.sg.sel.has(l.id)?" checked":""} aria-label="เลือกบันทึก ${esc(l.topic)}"></label>
        <div class="d"><b>${d?d.d+" "+d.ms:""}</b>${d?d.y:""}</div>
        <div style="min-width:0"><div class="t">${esc(l.teacher)}</div><div class="s">${esc((l.code?l.code+" ":"")+l.subject)} · ${esc(l.cls)} · แผนที่ ${esc(l.planNo)} ${esc(l.topic)}</div></div>
        <div class="c">${p==null?"":`<span class="chip ${p>=70?"good":"bad"}">ผ่าน ${fmtPct(p)}%</span>`}<button type="button" class="btn sm" data-open="${l.id}">${ic("eye")}ดู</button></div></div>`}).join("")
        :`<div class="empty"><h3>ลงนามครบทุกบันทึกแล้ว</h3><p>บันทึกใหม่ที่ครูส่งจะขึ้นที่นี่</p></div>`}</div>
    </div></div>`;
  const upd=()=>{$("bsN").textContent=S.sg.sel.size;$("bsBtn").disabled=!S.sg.sel.size;if($("selAll"))$("selAll").checked=rows.length>0&&S.sg.sel.size===rows.length};upd();
  m.querySelectorAll("[data-sel]").forEach(c=>c.onchange=()=>{c.checked?S.sg.sel.add(c.dataset.sel):S.sg.sel.delete(c.dataset.sel);upd()});
  $("selAll")&&($("selAll").onchange=e=>{rows.forEach(l=>e.target.checked?S.sg.sel.add(l.id):S.sg.sel.delete(l.id));m.querySelectorAll("[data-sel]").forEach(c=>c.checked=e.target.checked);upd()});
  $("sgT").onchange=e=>{S.sg.teacher=e.target.value;render()};
  bindQuick($("bsForm"),$("bsC"));
  $("bsForm").addEventListener("submit",e=>{e.preventDefault();const c=$("bsC").value.trim();if(!S.sg.sel.size)return;if(!c){toast("เขียนความคิดเห็นก่อนลงนาม");$("bsC").focus();return}
    const n=S.sg.sel.size;doSign([...S.sg.sel],c);S.sg.sel.clear();toast("ลงนามแล้ว "+n+" รายการ");render()});
}
const fileBase=l=>("บันทึกหลังสอน_"+(l.code||l.subject)+"_"+l.cls+"_แผน"+l.planNo+"_"+l.date).replace(/[\\/:*?"<>|\s]+/g,"-");

// ---------- view: write
const TXT=["cls","date","period","unitNo","unitName","planNo","topic","total","pass","failList","k","p","a","dBody","dEmo","dSoc","dInt","probOther","sugImprove","sugFix","teacher","position","signDate"];
const BOX=["probTime","probLate","probInterest","probOtherOn","sugImproveOn","sugFixOn","sugNone"];
function vWrite(m){
  const cur=curTerm(),edit=S.editId?D.logs.find(l=>l.id===S.editId):null;
  const asg=myAssigns(S.me,cur);
  if(!asg.length){m.innerHTML=`<div class="card gold empty"><h3>ยังไม่ได้กำหนดวิชาที่สอนในภาคเรียน ${esc(cur)}</h3><p>กำหนดวิชาและชั้นที่สอนก่อน แล้วระบบจะเติมข้อมูลรายวิชาในบันทึกให้อัตโนมัติ</p><button class="btn primary" data-go="subjects">${ic("layers")}กำหนดวิชาที่สอน</button></div>`;return}
  if(!S.w.assign||!asg.some(a=>a.id===S.w.assign))S.w.assign=(edit&&edit.assignId)||asg[0].id;
  const a=D.assigns.find(x=>x.id===S.w.assign),kg=a.level==="อนุบาล",u=me();
  const prior=D.logs.filter(l=>l.assignId===a.id&&l.id!==S.editId);
  const units=[...new Map(prior.map(l=>[l.unitNo,l.unitName])).entries()];
  const nextPlan=prior.length?Math.max(...prior.map(l=>+l.planNo||0))+1:1;
  const v=edit||{cls:(S.w.cls&&a.classes.includes(S.w.cls))?S.w.cls:a.classes[0],date:TODAY,unitNo:units.length?units[units.length-1][0]:"1",unitName:units.length?units[units.length-1][1]:"",planNo:String(nextPlan),teacher:u.name,position:u.position,signDate:TODAY};
  const val=k=>esc(v[k]??"");
  const kpaHTML=(kg?[["dBody","1","พัฒนาการด้านร่างกาย"],["dEmo","2","พัฒนาการด้านอารมณ์ จิตใจ"],["dSoc","3","พัฒนาการด้านสังคม"],["dInt","4","พัฒนาการด้านสติปัญญา"]]:[["k","K","นักเรียนมีความรู้ความเข้าใจ"],["p","P","นักเรียนมีความรู้เกิดทักษะ"],["a","A","นักเรียนมีเจตคติ ค่านิยม คุณธรรมจริยธรรม"]])
    .map(([id,b,t])=>`<label class="f c6"><span><span class="kpa">${b}</span>${t}</span><textarea id="${id}">${val(id)}</textarea></label>`).join("");
  m.innerHTML=`${S.term!==cur?`<div class="banner">${ic("info")}<div>บันทึกใหม่จะอยู่ในภาคเรียนปัจจุบัน (${esc(cur)})</div></div>`:""}
  <form class="log" id="wf" novalidate>
   <fieldset><legend>${edit?"แก้ไขบันทึก":"เลือกวิชาที่สอน"} · ภาคเรียน ${esc(cur)}</legend>
    <div class="picks">${asg.map(x=>`<button type="button" class="pick" data-asg="${x.id}" aria-pressed="${x.id===a.id}"><b>${esc((x.code?x.code+" ":"")+x.subject)}</b><small>${esc(x.level)} · ${esc(x.classes.join(", "))}</small></button>`).join("")}</div>
   </fieldset>
   <fieldset><legend>${kg?"หน่วยและแผนการจัดประสบการณ์":"หน่วยและแผนการจัดการเรียนรู้"}</legend>
    <label class="f c2">ชั้น/ห้อง<select id="cls">${a.classes.map(c=>`<option${v.cls===c?" selected":""}>${esc(c)}</option>`).join("")}</select></label>
    <label class="f c2">วันที่สอน<input id="date" type="date" value="${val("date")}"></label>
    <label class="f c2">คาบที่<input id="period" maxlength="20" value="${val("period")}" placeholder="เช่น 3"></label>
    <label class="f c1">หน่วยที่<input id="unitNo" list="unitList" maxlength="10" value="${val("unitNo")}"></label>
    <datalist id="unitList">${units.map(([n,t])=>`<option value="${esc(n)}">${esc(t)}</option>`).join("")}</datalist>
    <label class="f c5">${kg?"ชื่อหน่วยการจัดประสบการณ์":"ชื่อหน่วยการเรียนรู้"}<input id="unitName" maxlength="200" value="${val("unitName")}" placeholder="ชื่อหน่วยตามแผนการจัดการเรียนรู้"></label>
    <label class="f c1">แผนที่<input id="planNo" maxlength="10" value="${val("planNo")}"></label>
    <label class="f c5">เรื่อง<input id="topic" maxlength="200" value="${val("topic")}" placeholder="ชื่อเรื่องของแผนนี้"></label>
   </fieldset>
   <fieldset><legend>${kg?"ผลการจัดประสบการณ์":"ผลการจัดกิจกรรมการเรียนรู้"}</legend>
    <label class="f c2">นักเรียนทั้งหมด (คน)<input id="total" type="number" min="0" inputmode="numeric" value="${val("total")}"></label>
    <label class="f c2">ผ่านการประเมิน (คน)<input id="pass" type="number" min="0" inputmode="numeric" value="${val("pass")}"></label>
    <div class="calc" id="calc"></div>
    <label class="f c6">เลขที่/ชื่อนักเรียนที่ไม่ผ่าน (ถ้ามี)<textarea id="failList" rows="2">${val("failList")}</textarea></label>
    ${kpaHTML}
   </fieldset>
   <fieldset><legend>ปัญหาและอุปสรรค</legend><div class="opts">
    ${ck("probTime","กิจกรรมการจัดการเรียนรู้ ไม่เหมาะสมกับเวลา",v)}${ck("probLate","มีนักเรียนทำใบงาน/ใบกิจกรรมไม่ทันตามกำหนดเวลา",v)}${ck("probInterest","มีนักเรียนที่ไม่สนใจเรียน",v)}
    <div class="withtext">${ck("probOtherOn","อื่น ๆ",v)}<input id="probOther" value="${val("probOther")}" placeholder="ระบุปัญหาอื่น" aria-label="ปัญหาอื่น ๆ"></div></div></fieldset>
   <fieldset><legend>ข้อเสนอแนะ/แนวทางแก้ไข</legend><div class="opts">
    <div class="withtext">${ck("sugImproveOn","ควรนำแผนไปปรับปรุง เรื่อง",v)}<textarea id="sugImprove" rows="2" aria-label="เรื่องที่ควรปรับปรุง">${val("sugImprove")}</textarea></div>
    <div class="withtext">${ck("sugFixOn","แนวทางแก้ไขปัญหาและอุปสรรค",v)}<textarea id="sugFix" rows="3" aria-label="แนวทางแก้ไข">${val("sugFix")}</textarea></div>
    ${ck("sugNone","ไม่มีข้อเสนอแนะ",v)}</div></fieldset>
   <fieldset><legend>ผู้บันทึก</legend>
    <label class="f c2">ชื่อ-นามสกุล<input id="teacher" value="${val("teacher")}"></label>
    <label class="f c2">ตำแหน่ง<input id="position" value="${val("position")}"></label>
    <label class="f c2">วันที่ลงชื่อ<input id="signDate" type="date" value="${val("signDate")}"></label>
   </fieldset>
   <div class="actions"><button class="btn primary" type="submit">${edit?"บันทึกการแก้ไข":"บันทึก"}</button><button class="btn" type="button" data-go="${edit?"doc":"logs"}">ยกเลิก</button><span class="err" id="werr" role="alert"></span></div>
  </form>`;
  m.querySelectorAll("[data-asg]").forEach(b=>b.onclick=()=>{S.w.assign=b.dataset.asg;render()});
  const calc=()=>{const t=+$("total").value,p=+$("pass").value,o=$("calc");
    if($("total").value===""||$("pass").value===""||t<=0){o.textContent="กรอกจำนวนนักเรียนแล้วระบบคำนวณร้อยละให้";return}
    if(p>t){o.innerHTML='<b>จำนวนผ่านมากกว่าจำนวนนักเรียนทั้งหมด</b>';return}
    o.innerHTML=`<span>ผ่าน <b>${p}</b> คน ร้อยละ <b>${fmtPct(p/t*100)}</b></span><span>ไม่ผ่าน <b>${t-p}</b> คน ร้อยละ <b>${fmtPct((t-p)/t*100)}</b></span>`};
  $("total").oninput=calc;$("pass").oninput=calc;calc();
  $("unitNo").addEventListener("input",()=>{const hit=units.find(([n])=>n===$("unitNo").value.trim());if(hit)$("unitName").value=hit[1]});
  [["probOther","probOtherOn"],["sugImprove","sugImproveOn"],["sugFix","sugFixOn"]].forEach(([t,c])=>$(t).addEventListener("input",()=>{if($(t).value.trim()){$(c).checked=true;if(c!=="probOtherOn")$("sugNone").checked=false}}));
  $("sugNone").addEventListener("change",()=>{if($("sugNone").checked){$("sugImproveOn").checked=false;$("sugFixOn").checked=false}});
  $("wf").addEventListener("submit",e=>{
    e.preventDefault();const o={};TXT.forEach(k=>{const el=$(k);o[k]=el?el.value.trim():""});BOX.forEach(k=>o[k]=$(k).checked);
    const need={date:"วันที่สอน",unitNo:"หน่วยที่",planNo:"แผนที่",topic:"เรื่อง",total:"นักเรียนทั้งหมด",pass:"ผ่านการประเมิน",teacher:"ชื่อผู้บันทึก"};
    const miss=Object.keys(need).filter(k=>!o[k]);
    if(miss.length){$("werr").textContent="กรอกให้ครบ: "+miss.map(k=>need[k]).join(", ");$(miss[0]).focus();return}
    o.total=Math.max(0,parseInt(o.total,10)||0);o.pass=Math.max(0,parseInt(o.pass,10)||0);
    if(o.pass>o.total){$("werr").textContent="จำนวนผ่านต้องไม่เกินจำนวนนักเรียนทั้งหมด";return}
    const base={authorId:S.me,assignId:a.id,term:cur,level:a.level,group:a.group,code:a.code,subject:a.subject};
    if(edit){updateDoc(doc(db,"logs",edit.id),{...o,...base,updatedAt:serverTimestamp()}).then(()=>toast("บันทึกขึ้นระบบแล้ว")).catch(e=>toast(fsMsg(e)));S.editId=null;openDoc(edit.id)}
    else{const ref=doc(collection(db,"logs"));setDoc(ref,{...base,...o,createdAt:serverTimestamp(),updatedAt:serverTimestamp()}).then(()=>toast("บันทึกขึ้นระบบแล้ว")).catch(e=>toast(fsMsg(e)));setTerm(cur);openDoc(ref.id)}
  });
}
const ck=(id,t,v)=>`<label class="check"><input type="checkbox" id="${id}"${v[id]?" checked":""}> ${t}</label>`;

// ---------- view: binder
function vBinder(m){
  const teachers=D.users.filter(u=>D.assigns.some(a=>a.teacherId===u.id&&a.term===S.term));
  let tid=isAdmin()?(S.b.teacher||(teachers.some(t=>t.id===S.me)?S.me:(teachers[0]||{}).id)):S.me;
  const asg=myAssigns(tid,S.term);
  if(!asg.some(a=>a.id===S.b.assign))S.b.assign=asg[0]?asg[0].id:"";
  const a=D.assigns.find(x=>x.id===S.b.assign);
  const head=`${oldBanner()}<div class="card gold"><div class="grid-f">
    ${isAdmin()?`<label class="f">ครูผู้สอน<select id="bt">${teachers.map(u=>`<option value="${u.id}"${u.id===tid?" selected":""}>${esc(u.name)}</option>`).join("")}</select></label>`:""}
    <label class="f wide">วิชา<select id="ba">${asg.map(x=>`<option value="${x.id}"${x.id===S.b.assign?" selected":""}>${esc((x.code?x.code+" ":"")+x.subject+" · "+x.classes.join(", "))}</option>`).join("")}</select></label></div></div>`;
  if(!a){m.innerHTML=head+`<div class="card empty"><h3>ไม่มีวิชาในภาคเรียน ${esc(S.term)}</h3><p>รวมเล่มจะแสดงบันทึกแยกตามหน่วย และรวมเป็นเล่มทั้งวิชา เรียงตามวันที่</p></div>`;bindB();return}
  const logs=D.logs.filter(l=>l.assignId===a.id).sort((x,y)=>x.date.localeCompare(y.date)||x.planNo-y.planNo||x.cls.localeCompare(y.cls,"th",{numeric:true}));
  const groups=[...logs.reduce((mp,l)=>mp.set(l.unitNo,[...(mp.get(l.unitNo)||[]),l]),new Map())].sort((x,y)=>x[0]-y[0]);
  m.innerHTML=head+`
  <div class="card gold stack"><div class="row2"><div style="min-width:0;flex:1 1 240px"><h2>${esc((a.code?a.code+" ":"")+a.subject)}</h2>
    <div class="muted">${esc(user(a.teacherId).name)} · ${esc(a.level)} · ${esc(a.classes.join(", "))} · ภาคเรียนที่ ${esc(a.term)}</div></div>
    <button class="btn gold" id="pdfAll"${logs.length?"":" disabled"}>${ic("eye")}ดูรวมเล่มทั้งวิชา / PDF</button></div>
    <div class="muted" style="font-size:.88rem">รวมเล่มมีหน้าปก สารบัญ และบันทึกทุกแผน เรียงตามหน่วยและวันที่สอน · ${logs.length} บันทึก · ${groups.length} หน่วย</div></div>
  ${groups.length?groups.map(([n,ls])=>`<section class="unit"><header><span class="n">${esc(n)}</span><div><b>หน่วยที่ ${esc(n)} ${esc(ls[0].unitName)}</b><small>${ls.length} บันทึก · ${shortDate(ls[0].date)} – ${shortDate(ls[ls.length-1].date)}</small></div>
    <button class="btn sm" data-pdfunit="${esc(n)}">${ic("eye")}PDF หน่วยนี้</button></header>
    <div class="list" style="border:0;border-radius:0">${ls.map(l=>itemHTML(l,false)).join("")}</div></section>`).join("")
    :`<div class="card empty"><h3>วิชานี้ยังไม่มีบันทึก</h3></div>`}`;
  bindB();
  $("pdfAll").onclick=()=>makePdf(logs,"รวมเล่ม_"+(a.code||a.subject)+"_"+a.term.replace("/","-"),a);
  m.querySelectorAll("[data-pdfunit]").forEach(b=>b.onclick=()=>{const n=b.dataset.pdfunit;makePdf(logs.filter(l=>l.unitNo===n),"หน่วยที่"+n+"_"+(a.code||a.subject)+"_"+a.term.replace("/","-"))});
  function bindB(){$("bt")&&($("bt").onchange=e=>{S.b.teacher=e.target.value;S.b.assign="";render()});$("ba")&&($("ba").onchange=e=>{S.b.assign=e.target.value;render()})}
}

// ---------- view: subjects (teaching assignments)
function vSubjects(m){
  const cur=curTerm(),tid=isAdmin()&&S.sub.teacher?S.sub.teacher:S.me,own=tid===S.me;
  const now=myAssigns(tid,S.term),editable=own&&S.term===cur;
  const hist=[...new Set(D.assigns.filter(a=>a.teacherId===tid&&a.term!==S.term).map(a=>a.term))].sort(termCmp);
  const prevAs=myAssigns(tid,prevTerm(cur));
  if(!S.np.grade){const gs=[...now,...prevAs].flatMap(x=>x.classes||[]).map(c=>c.split("/")[0]).filter(c=>GRADES.includes(c));S.np.grade=gs[0]||"ม.1"}
  m.innerHTML=`${oldBanner()}
  ${isAdmin()?`<div class="card"><label class="f">ดูวิชาที่สอนของ<select id="st">${D.users.filter(u=>u.active).map(u=>`<option value="${u.id}"${u.id===tid?" selected":""}>${esc(u.name)}${u.id===S.me?" (ฉัน)":""}</option>`).join("")}</select></label></div>`:""}
  <div class="sec-h"><h2>ภาคเรียนที่ ${esc(S.term)}</h2>${S.term===cur?'<span class="chip gold">ปัจจุบัน</span>':""}<span class="sp"></span>
    ${editable&&!now.length&&prevAs.length?`<button class="btn sm" id="copyPrev">${ic("copy")}คัดลอกจากภาคเรียน ${esc(prevTerm(cur))}</button>`:""}</div>
  <div class="list">${now.length?now.map(a=>{const n=D.logs.filter(l=>l.assignId===a.id).length;return `<div class="item" style="cursor:default"><div class="d"><b>${esc(a.code||"ปฐมวัย")}</b>${esc(a.level)}</div>
    <div style="min-width:0"><div class="t">${esc(a.subject)}</div><div class="s">${esc(a.group)} · ${esc(a.classes.join(", "))}</div></div>
    <div class="c"><span class="chip red">${n} บันทึก</span>${editable&&!n?`<button class="btn sm danger" data-delasg="${a.id}">ลบ</button>`:""}</div></div>`}).join("")
    :`<div class="empty"><h3>${own?"ยังไม่ได้กำหนดวิชาที่สอน":"ครูยังไม่ได้กำหนดวิชาที่สอน"}</h3><p>กำหนดวิชา ระดับชั้น และห้องที่สอนในแต่ละภาคเรียน ระบบจะเก็บเป็นประวัติการสอนไว้ทุกปีการศึกษา</p></div>`}</div>
  ${editable?`<form class="card gold stack" id="asgForm"><h2>เพิ่มวิชาที่สอน · ภาคเรียน ${esc(cur)}</h2>
    <div class="grid-f"><label class="f">ชั้นที่สอน<select id="nGrade">${GRADES.map(x=>`<option${x===S.np.grade?" selected":""}>${x}</option>`).join("")}</select></label></div>
    <div class="stack" style="gap:6px"><span class="muted" style="font-size:.84rem">เลือกรายวิชา (เลือกได้หลายวิชา)</span><div class="picks" id="nCourses"></div></div>
    <div class="stack" style="gap:6px"><span class="muted" style="font-size:.84rem">ห้องที่สอน</span><div class="picks" id="nRooms"></div>
      <input id="nCls" placeholder="หรือพิมพ์ชื่อห้องเอง คั่นด้วยจุลภาค เช่น ม.1/1, ม.1/2" aria-label="ห้องที่สอนเพิ่มเติม"></div>
    <details id="nOther"><summary style="cursor:pointer;color:var(--accent);font-weight:600">วิชาที่ไม่มีในรายการ / ระดับปฐมวัย</summary>
      <div class="grid-f" style="margin-top:10px">
        <label class="f">กลุ่มสาระการเรียนรู้<select id="nGroup">${GROUPS.map(x=>`<option>${esc(x)}</option>`).join("")}<option>ปฐมวัย</option><option>กิจกรรมพัฒนาผู้เรียน</option></select></label>
        <label class="f">รหัสวิชา<input id="nCode" maxlength="20" placeholder="ถ้ามี"></label>
        <label class="f wide">ชื่อวิชา<input id="nSubj" maxlength="100" placeholder="ชื่อวิชาหรือกิจกรรม"></label></div></details>
    <div class="actions"><button class="btn primary" type="submit">${ic("plus")}เพิ่มวิชาที่เลือก</button><span class="err" id="aerr"></span></div></form>`:""}
  <div class="sec-h"><h2>ประวัติการสอน</h2></div>
  ${hist.length?hist.map(t=>`<div class="card"><div class="row2"><b>ภาคเรียนที่ ${esc(t)}</b><span class="sp"></span><button class="btn sm ghost" data-term="${t}">เปิดดูภาคเรียนนี้</button></div>
    <div class="stack" style="gap:4px;margin-top:6px">${myAssigns(tid,t).map(a=>`<div class="muted">${esc((a.code?a.code+" ":"")+a.subject)} · ${esc(a.classes.join(", "))}</div>`).join("")}</div></div>`).join("")
    :`<div class="card muted">ยังไม่มีประวัติภาคเรียนอื่น</div>`}`;
  $("st")&&($("st").onchange=e=>{S.sub.teacher=e.target.value;render()});
  m.querySelectorAll("[data-term]").forEach(b=>b.onclick=()=>{S.term=b.dataset.term;render()});
  m.querySelectorAll("[data-delasg]").forEach(b=>b.onclick=()=>{deleteDoc(doc(db,"assigns",b.dataset.delasg)).then(()=>toast("ลบวิชาแล้ว")).catch(e=>toast(fsMsg(e)))});
  $("copyPrev")&&($("copyPrev").onclick=()=>{const b=writeBatch(db);prevAs.forEach(a=>{const{id,...rest}=a;b.set(doc(collection(db,"assigns")),{...rest,term:cur})});b.commit().then(()=>toast("คัดลอกวิชาแล้ว ลบรายการที่ไม่ได้สอนได้")).catch(e=>toast(fsMsg(e)))});
  if(editable){
    const termNo=cur.split("/")[0];
    const fillPick=()=>{const g=$("nGrade").value,lv=levelOfGrade(g);S.np.grade=g;
      const has=new Set(now.map(a=>a.courseId).filter(Boolean)),cs=D.courses.filter(c=>c.grade===g&&(c.sem===termNo||c.sem==="1,2")).sort(courseSort);
      $("nCourses").innerHTML=cs.length?cs.map(c=>`<button type="button" class="pick" data-cid="${c.id}" aria-pressed="${S.np.sel.has(c.id)}"${has.has(c.id)?" disabled":""}><b>${esc((c.code?c.code+" ":"")+c.name)}</b><small>${c.type==="กิจกรรม"?"กิจกรรมพัฒนาผู้เรียน · "+esc(c.hours)+" ชม.":esc(c.group)+" · "+esc(c.hours)+" ชม. ("+credit(c.hours)+")"}${has.has(c.id)?" · เพิ่มแล้ว":""}</small></button>`).join("")
        :`<p class="muted" style="margin:0">${lv==="อนุบาล"?"ระดับปฐมวัยใช้การจัดประสบการณ์ กรอกที่ \"วิชาที่ไม่มีในรายการ\" ด้านล่าง":"ยังไม่มีรายวิชาของชั้นนี้ แจ้งแอดมินโรงเรียนให้เพิ่มที่เมนู \"รายวิชาของโรงเรียน\""}</p>`;
      if(lv==="อนุบาล"){$("nOther").open=true;if(!$("nSubj").value)$("nSubj").value="การจัดประสบการณ์";$("nGroup").value="ปฐมวัย"}
      $("nRooms").innerHTML=[g,1,2,3,4].map((r,i)=>{const v=i?g+"/"+r:g;return `<button type="button" class="pick room" data-room="${v}" aria-pressed="${S.np.rooms.has(v)}"><b>${i?v:g+" (ห้องเดียว)"}</b></button>`}).join("");
      $("nCourses").querySelectorAll("[data-cid]").forEach(b=>b.onclick=()=>{const id=b.dataset.cid,on=!S.np.sel.has(id);on?S.np.sel.add(id):S.np.sel.delete(id);b.setAttribute("aria-pressed",on)});
      $("nRooms").querySelectorAll("[data-room]").forEach(b=>b.onclick=()=>{const r=b.dataset.room,on=!S.np.rooms.has(r);on?S.np.rooms.add(r):S.np.rooms.delete(r);b.setAttribute("aria-pressed",on)});
    };
    $("nGrade").onchange=()=>{S.np.sel.clear();S.np.rooms.clear();fillPick()};fillPick();
    $("asgForm").addEventListener("submit",e=>{e.preventDefault();$("aerr").textContent="";
      const g=$("nGrade").value,typed=$("nCls").value.split(/[,،]+/).map(s=>s.trim()).filter(Boolean),cls=[...new Set([...S.np.rooms,...typed])];
      const items=[...S.np.sel].map(id=>D.courses.find(c=>c.id===id)).filter(Boolean).map(c=>({level:c.level,group:c.group,code:c.code||"",subject:c.name,courseId:c.id,hours:+c.hours||0}));
      const custom=$("nSubj").value.trim();if(custom)items.push({level:levelOfGrade(g),group:$("nGroup").value,code:$("nCode").value.trim(),subject:custom});
      if(!items.length){$("aerr").textContent="เลือกรายวิชาอย่างน้อย 1 วิชา";return}
      if(!cls.length){$("aerr").textContent="เลือกห้องที่สอน";return}
      if(cls.length>30){$("aerr").textContent="เลือกห้องได้ไม่เกิน 30 ห้อง";return}
      S.np.sel.clear();S.np.rooms.clear();asgAdd(items.map(x=>({...x,teacherId:S.me,term:cur,classes:cls})))});
  }
}

// ---------- view: track (admin)
function vTrack(m){
  if(!isAdmin()){go("logs");return}
  const cur=S.term===curTerm(),per=cur?(["cycle","prev","month","term"].includes(S.tr.period)?S.tr.period:"cycle"):"term";
  const cy=per==="prev"?prevCycle(cycleOf(TODAY)):cycleOf(TODAY),isCy=per==="cycle"||per==="prev";
  const [from,to]=isCy?[cy.from,cy.to]:per==="month"?[addDays(TODAY,-29),TODAY]:["0000","9999"];
  const perTxt=isCy?(per==="prev"?"รอบที่แล้ว · ":"รอบนี้ · ")+cy.label:per==="month"?"30 วันล่าสุด":"ทั้งภาคเรียน";
  const st=n=>isCy?dueStatus(n,cy):n?{k:"good",t:`ส่งแล้ว ${n}`}:{k:"bad",t:"ยังไม่ส่ง"};
  const tchs=D.users.filter(u=>u.active&&D.assigns.some(a=>a.teacherId===u.id&&a.term===S.term)&&(!S.tr.group||D.assigns.some(a=>a.teacherId===u.id&&a.term===S.term&&a.group===S.tr.group)));
  const noAsg=D.users.filter(u=>u.active&&u.role!=="superadmin"&&!D.assigns.some(a=>a.teacherId===u.id&&a.term===S.term));
  const rows=tchs.map(u=>{const all=D.logs.filter(l=>l.authorId===u.id&&l.term===S.term),inP=all.filter(l=>l.date>=from&&l.date<=to);
    return{u,asg:myAssigns(u.id,S.term),all,inP,last:all.map(l=>l.date).sort().pop(),wait:all.filter(l=>!reviewed(l.id)).length}}).sort((a,b)=>(a.inP.length>0)-(b.inP.length>0)||a.u.name.localeCompare(b.u.name,"th"));
  const sent=rows.filter(r=>st(r.inP.length).k==="good").length,late=rows.filter(r=>st(r.inP.length).k==="bad").length;
  m.innerHTML=`${oldBanner()}<div class="card gold"><div class="grid-f">
    <label class="f">ช่วงเวลา<select id="tp"${cur?"":" disabled"}>${[["cycle","รอบนี้"],["prev","รอบที่แล้ว"],["month","30 วันล่าสุด"],["term","ทั้งภาคเรียน"]].map(([v,t])=>`<option value="${v}"${per===v?" selected":""}>${t}</option>`).join("")}</select></label>
    <label class="f">กลุ่มสาระฯ<select id="tg"><option value="">ทุกกลุ่มสาระ</option>${[...GROUPS,"ปฐมวัย"].map(g=>`<option${S.tr.group===g?" selected":""}>${esc(g)}</option>`).join("")}</select></label>
  </div>${isCy?`<div class="duebar" style="margin-top:12px">${ic("info")}<span>กำหนดส่ง <b>${esc(FREQ[D.settings.dueFreq||"week"])}</b> · อย่างน้อย <b>${Math.max(1,+(D.settings.dueMin||1))} ฉบับ</b>ต่อรอบ · ${esc(cy.label)} ส่งภายใน<b>${esc(dueTxt(cy))}</b></span>${isAdmin()?`<button class="btn sm ghost" data-go="settings">แก้กำหนดส่ง</button>`:""}</div>`:""}</div>
  <div class="tiles"><div><b>${rows.length}</b><span>ครูที่มีวิชาสอน</span></div><div><b style="color:var(--good)">${sent}</b><span>ส่งแล้ว</span></div>
    <div><b style="color:var(--bad)">${isCy?late:rows.length-sent}</b><span>${isCy?"เลยกำหนด":"ยังไม่ส่ง"}</span></div><div><b>${rows.reduce((s,r)=>s+r.wait,0)}</b><span>รอลงนาม</span></div></div>
  <div class="sec-h"><h2>สถานะการส่ง ${esc(perTxt)}</h2><span class="sp"></span>${DL?`<button class="btn sm" id="tcsv">${ic("pdf")}CSV สรุป</button>`:""}</div>
  <div class="card" style="padding:0"><div class="tw"><table class="t cards"><thead><tr><th>ครูผู้สอน</th><th>วิชาที่สอน</th><th class="c">สถานะ</th><th class="c">ทั้งภาคเรียน</th><th class="c">ส่งล่าสุด</th><th class="c">รอลงนาม</th><th></th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td class="full"><b class="nw">${esc(r.u.name)}</b><div class="muted nw" style="font-size:.8rem">${esc(r.u.position)}</div></td>
    <td class="full muted" style="font-size:.86rem">${esc(r.asg.map(a=>(a.code||"")+" "+a.subject).join(", "))}</td>
    <td class="c" data-l="สถานะ">${(x=>`<span class="chip ${x.k}">${x.t}</span>`)(st(r.inP.length))}</td>
    <td class="num" data-l="ทั้งภาคเรียน">${r.all.length}</td><td class="c nw" data-l="ล่าสุด">${r.last?shortDate(r.last):"—"}</td><td class="num" data-l="รอลงนาม">${r.wait}</td>
    <td class="full"><div class="row2" style="gap:6px"><button class="btn sm" data-seet="${r.u.id}">ดูบันทึก</button>${r.all.length?`<button class="btn sm" data-pdft="${r.u.id}">${ic("eye")}PDF</button>`:""}</div></td></tr>`).join("")}
  </tbody></table></div></div>
  ${noAsg.length?`<div class="card"><b>ยังไม่ได้กำหนดวิชาที่สอนในภาคเรียนนี้</b><div class="muted">${noAsg.map(u=>esc(u.name)).join(" · ")}</div></div>`:""}`;
  $("tp").onchange=e=>{S.tr.period=e.target.value;render()};$("tg").onchange=e=>{S.tr.group=e.target.value;render()};
  m.querySelectorAll("[data-seet]").forEach(b=>b.onclick=()=>{S.f={teacher:b.dataset.seet,assign:"",unit:"",cls:"",status:"",q:""};go("logs")});
  m.querySelectorAll("[data-pdft]").forEach(b=>b.onclick=()=>{const u=user(b.dataset.pdft);const ls=D.logs.filter(l=>l.authorId===u.id&&l.term===S.term).sort((x,y)=>(x.code+x.subject).localeCompare(y.code+y.subject)||x.unitNo-y.unitNo||x.date.localeCompare(y.date));makePdf(ls,"บันทึกหลังสอน_"+u.name+"_"+S.term.replace("/","-"))});
  $("tcsv")&&($("tcsv").onclick=()=>saveText("สรุปการส่งบันทึก_"+S.term.replace("/","-")+".csv",[["ครูผู้สอน","ตำแหน่ง","วิชาที่สอน","ส่งช่วงนี้","ทั้งภาคเรียน","ส่งล่าสุด","รอลงนาม"],...rows.map(r=>[r.u.name,r.u.position,r.asg.map(a=>(a.code||"")+" "+a.subject).join(" / "),r.inP.length,r.all.length,r.last||"",r.wait])]));
}

// ---------- view: courses (admin)
function vCourses(m){
  if(!isAdmin()){go("home");return}
  const g=S.cg||"ม.1",lv=levelOfGrade(g),sems=lv==="มัธยมศึกษา"?["1","2"]:["1,2"];
  const list=D.courses.filter(c=>c.grade===g).sort(courseSort),ed=S.ce?D.courses.find(c=>c.id===S.ce):null;
  const hc=h=>`${(+h).toLocaleString("en-US")}(${credit(h)})`;
  const table=sem=>{const rows=list.filter(c=>c.sem===sem);let ss=0,as=0;
    let body=["พื้นฐาน","เพิ่มเติม","กิจกรรม"].map(t=>{const rs=rows.filter(c=>c.type===t);if(!rs.length)return"";
      return `<tr class="grp"><td colspan="4">${t==="กิจกรรม"?"กิจกรรมพัฒนาผู้เรียน":"รายวิชา"+t}</td></tr>`+rs.map(c=>{if(t==="กิจกรรม")as+=+c.hours;else ss+=+c.hours;
        return `<tr><td class="nw">${esc(c.code||"—")}</td><td>${esc(c.name)}</td><td class="c nw">${t==="กิจกรรม"?esc(c.hours):hc(c.hours)}</td>
        <td class="c"><div class="row2" style="gap:6px;justify-content:center"><button class="btn sm" data-ce="${c.id}">แก้ไข</button><button class="btn sm danger" data-cd="${c.id}">ลบ</button></div></td></tr>`}).join("")}).join("");
    if(rows.length)body+=`<tr class="sum"><td colspan="2">รวมรายวิชา</td><td class="c nw">${hc(ss)}</td><td></td></tr><tr class="sum"><td colspan="2">รวมกิจกรรมพัฒนาผู้เรียน</td><td class="c">${as}</td><td></td></tr><tr class="sum total"><td colspan="2">รวมทั้งสิ้น</td><td class="c">${(ss+as).toLocaleString("en-US")}</td><td></td></tr>`;
    return `<div class="card" style="padding:0"><div class="sec-h" style="padding:14px 16px 8px"><h2>ภาคเรียนที่ ${sem}</h2><span class="sp"></span><span class="muted">${rows.filter(c=>c.type!=="กิจกรรม").length} รายวิชา · ${rows.filter(c=>c.type==="กิจกรรม").length} กิจกรรม</span></div>
      <div class="tw"><table class="t ctab"><thead><tr><th style="width:96px">รหัสวิชา</th><th>รายวิชา</th><th class="c" style="width:140px">ชั่วโมง (น้ำหนัก)</th><th class="c" style="width:160px">จัดการ</th></tr></thead>
      <tbody>${rows.length?body:`<tr><td colspan="4" class="c muted">ยังไม่มีรายวิชา</td></tr>`}</tbody></table></div></div>`};
  m.innerHTML=`${!D.courses.length?`<div class="banner">${ic("info")}<div style="flex:1">ยังไม่มีรายวิชาในระบบ นำเข้ารายวิชาตามโครงสร้างหลักสูตรของโรงเรียน (ป.1–ป.6 และ ม.1–ม.3) ได้ในคลิกเดียว แล้วแก้ไขต่อได้</div><button class="btn gold sm" id="cSeed">นำเข้า ${buildCourseSeed().length} รายการ</button></div>`:""}
  <div class="card gold"><div class="grid-f"><label class="f">ชั้น<select id="cG">${GRADES.map(x=>`<option${x===g?" selected":""}>${x}</option>`).join("")}</select></label>
    <div class="f"><span>ระดับ</span><div style="min-height:42px;display:flex;align-items:center"><span class="chip red">${esc(lv)}${lv==="มัธยมศึกษา"?" · แยกภาคเรียน 1 และ 2":lv==="ประถมศึกษา"?" · รายปี (ภาคเรียนที่ 1,2)":""}</span></div></div>
    ${lv==="อนุบาล"?"":`<div class="f"><span>&nbsp;</span><button class="btn primary" id="cAdd">${ic("plus")}เพิ่มรายวิชา ${esc(g)}</button></div>`}</div></div>
  ${lv==="อนุบาล"?`<div class="card muted">ระดับปฐมวัยใช้หน่วยการจัดประสบการณ์ ไม่มีรายวิชา ครูกำหนดได้เองที่เมนู "วิชาที่สอน"</div>`:sems.map(table).join("")}
`;
  $("cG").onchange=e=>{S.cg=e.target.value;S.ce=null;render()};
  $("cSeed")&&($("cSeed").onclick=()=>{$("cSeed").disabled=true;courseSeed()});
  m.querySelectorAll("[data-ce]").forEach(b=>b.onclick=()=>courseForm(g,lv,sems,D.courses.find(c=>c.id===b.dataset.ce)));
  $("cAdd")&&($("cAdd").onclick=()=>courseForm(g,lv,sems,null));
  m.querySelectorAll("[data-cd]").forEach(b=>b.onclick=()=>{if(!b.dataset.arm){b.dataset.arm="1";b.textContent="กดอีกครั้งเพื่อลบ";setTimeout(()=>{if(b.isConnected){delete b.dataset.arm;b.textContent="ลบ"}},3000);return}courseDel(b.dataset.cd)});
}

function courseForm(g,lv,sems,ed){
  openModal((ed?"แก้ไขรายวิชา":"เพิ่มรายวิชา")+" · ชั้น "+g,`<form class="stack" id="cf" novalidate><div class="grid-f">
    <label class="f">ภาคเรียน<select id="cS">${sems.map(s=>`<option value="${s}"${(ed?ed.sem:sems[0])===s?" selected":""}>ภาคเรียนที่ ${s}</option>`).join("")}</select></label>
    <label class="f">ประเภท<select id="cT">${["พื้นฐาน","เพิ่มเติม","กิจกรรม"].map(t=>`<option value="${t}"${(ed?ed.type:"พื้นฐาน")===t?" selected":""}>${t==="กิจกรรม"?"กิจกรรมพัฒนาผู้เรียน":"รายวิชา"+t}</option>`).join("")}</select></label>
    <label class="f">รหัสวิชา<input id="cC" maxlength="12" value="${esc(ed?ed.code:"")}" placeholder="เช่น ส21103 (กิจกรรมเว้นว่างได้)"></label>
    <label class="f">ชั่วโมง<input id="cH" type="number" min="1" max="400" inputmode="numeric" value="${esc(ed?ed.hours:"")}" placeholder="เช่น 40"></label>
    <label class="f wide">ชื่อรายวิชา<input id="cN" maxlength="100" value="${esc(ed?ed.name:"")}" placeholder="เช่น ประวัติศาสตร์ 1"></label></div>
    <div class="actions"><button class="btn primary" type="submit">${ed?ic("check")+"บันทึกการแก้ไข":ic("plus")+"เพิ่มรายวิชา"}</button><button type="button" class="btn" data-mx>ยกเลิก</button><span class="muted" id="cCr" style="font-size:.86rem"></span><span class="err" id="cerr"></span></div></form>`);
  const cr=()=>{const h=+$("cH").value;$("cCr").textContent=h>0&&$("cT").value!=="กิจกรรม"?`น้ำหนัก ${credit(h)} หน่วยกิต`:""};$("cH").oninput=cr;$("cT").onchange=cr;cr();
  $("cf").addEventListener("submit",e=>{e.preventDefault();$("cerr").textContent="";const name=$("cN").value.trim(),h=parseInt($("cH").value,10),t=$("cT").value,code=$("cC").value.trim();
    if(!name){$("cerr").textContent="กรอกชื่อรายวิชา";return}if(!(h>0&&h<=400)){$("cerr").textContent="กรอกชั่วโมง 1–400";return}
    const c={grade:g,sem:$("cS").value,code,name,hours:h,type:t,group:t==="กิจกรรม"?"กิจกรรมพัฒนาผู้เรียน":(GROUP_OF[code[0]]||""),level:lv,order:ed&&ed.order!=null?ed.order:9000+D.courses.length};
    if(ed)c.id=ed.id;closeModal(true);courseSave(c)});
}

// ---------- modal (หน้าต่างลอย ใช้กรอกฟอร์มโดยไม่ดันหน้าเลื่อน)
function openModal(title,html,{wide=false,keep=false}={}){
  closeModal(true);
  const w=document.createElement("div");w.className="modal";w.id="modal";if(keep)w.dataset.keep="1";
  w.innerHTML=`<div class="mpanel${wide?" wide":""}" role="dialog" aria-modal="true" aria-labelledby="mTitle"><div class="mhead"><h2 id="mTitle">${esc(title)}</h2><button type="button" class="btn sm ghost mx" aria-label="ปิด" title="ปิด">${ic("x")}</button></div><div class="mbody" id="mBody">${html}</div></div>`;
  document.body.appendChild(w);document.body.classList.add("noscroll");
  w.querySelector(".mx").onclick=()=>closeModal();
  w.addEventListener("click",e=>{if(e.target.closest("[data-mx]"))closeModal()});
  setTimeout(()=>{const f=w.querySelector(".mbody input:not([type=hidden]):not([readonly]),.mbody select");f&&f.focus()},40);
  return $("mBody");
}
function closeModal(silent){const m=$("modal");if(!m)return;if(!silent&&m.dataset.keep&&m.dataset.dirty&&!confirmLeave(m))return;m.remove();document.body.classList.remove("noscroll")}
function confirmLeave(m){const b=m.querySelector(".mx");if(b.dataset.arm)return true;b.dataset.arm="1";toast("ข้อมูลที่กรอกจะหายไป กดปิดอีกครั้งเพื่อยืนยัน");setTimeout(()=>{if(b.isConnected)delete b.dataset.arm},3000);return false}

// ---------- ชื่อผู้ใช้อัตโนมัติ (เดาจากรูปแบบที่โรงเรียนใช้ เช่น bpt001, bpt002)
function userPattern(){
  const cnt={};D.users.forEach(u=>{const mm=/^([a-z._-]*?)(\d+)$/.exec(u.username||"");if(!mm)return;const k=mm[1];cnt[k]=cnt[k]||{n:0,w:0,max:0,t:0};const c=cnt[k];c.n++;c.w=Math.max(c.w,mm[2].length);c.max=Math.max(c.max,+mm[2]);if(u.role==="teacher")c.t++});
  const best=Object.entries(cnt).sort((a,b)=>b[1].t-a[1].t||b[1].n-a[1].n)[0];
  return best?{prefix:best[0],width:best[1].w}:{prefix:"teacher",width:2};
}
function autoUsernames(prefix,width,count,taken){
  const out=[];let n=0;D.users.forEach(u=>{const mm=new RegExp("^"+prefix.replace(/[.]/g,"\\.")+"(\\d+)$").exec(u.username||"");if(mm)n=Math.max(n,+mm[1])});
  while(out.length<count){n++;const v=prefix+String(n).padStart(width,"0");if(!taken.has(v))out.push(v)}
  return out;
}
const tmpPw=()=>String(Math.floor(100000+Math.random()*900000));

// ---------- view: people (admin)
function vPeople(m){
  if(!isAdmin()){go("home");return}
  const order={superadmin:0,admin:1,teacher:2};
  const us=[...D.users].filter(u=>isSuper()||u.role!=="superadmin").sort((a,b)=>order[a.role]-order[b.role]||(a.active===false)-(b.active===false)||a.name.localeCompare(b.name,"th"));
  const canManage=u=>u.id!==S.me&&(u.role==="teacher"||(isSuper()&&u.role==="admin"));
  const nT=us.filter(u=>u.role==="teacher"&&u.active).length,nA=us.filter(u=>u.role==="admin"&&u.active).length,nOff=us.filter(u=>!u.active).length;
  m.innerHTML=`${S.pwNote?`<div class="banner" style="background:var(--good-soft);border-color:var(--good)">${ic("check")}<div style="flex:1">${S.pwNote}</div><button class="btn sm ghost" id="pwX" aria-label="ปิดข้อความ">${ic("x")}</button></div>`:""}
  <div class="card ptool"><div class="prow">
    <label class="f psearch"><span class="sr-only">ค้นหา</span><input id="pq" type="search" placeholder="ค้นหาชื่อ ชื่อผู้ใช้ หรือตำแหน่ง" value="${esc(S.pq||"")}" autocomplete="off"></label>
    <label class="f pfilter"><span class="sr-only">กรองตามสิทธิ์</span><select id="pr">${[["","ทุกบัญชี ("+us.length+")"],["admin","แอดมินโรงเรียน ("+nA+")"],["teacher","ครูผู้สอน ("+nT+")"],["off","ปิดใช้งาน ("+nOff+")"]].map(([v,t])=>`<option value="${v}"${(S.pr||"")===v?" selected":""}>${t}</option>`).join("")}</select></label>
    <div class="pbtns"><button class="btn" id="pAdd1">${ic("plus")}เพิ่มทีละคน</button><button class="btn primary" id="pAddN">${ic("plus")}เพิ่มหลายคน</button></div>
  </div><div class="muted pcount" id="pCount"></div></div>
  <div class="card" style="padding:0"><div class="tw ptable" id="pTable"><table class="t cards"><thead><tr><th>ชื่อ</th><th>ชื่อผู้ใช้</th><th>ตำแหน่ง</th><th class="c">สิทธิ์</th><th class="c">วิชา (${esc(S.term)})</th><th class="c">จัดการ</th></tr></thead><tbody>
  ${us.map(u=>`<tr data-s="${esc([u.name,u.username,u.position,u.google].join(" ").toLowerCase())}" data-r="${u.role}" data-on="${u.active?1:0}"><td class="full"><b class="nw">${esc(u.name)}</b>${u.id===S.me?' <span class="chip">ฉัน</span>':""}${u.active?"":' <span class="chip bad">ปิดใช้งาน</span>'}</td>
    <td data-l="ชื่อผู้ใช้">${u.google?`<span class="chip gold">Google</span> <small class="muted">${esc(u.google)}</small>`:`<code>${esc(u.username)}</code>`}</td><td data-l="ตำแหน่ง">${esc(u.position)}</td>
    <td class="c" data-l="สิทธิ์">${u.role==="superadmin"?'<span class="chip gold">แอดมินหลัก</span>':`<span class="chip ${u.role==="admin"?"red":""}">${ROLE[u.role]}</span>`}</td>
    <td class="num" data-l="วิชา">${myAssigns(u.id,S.term).length}</td>
    <td class="full c">${canManage(u)?`<div class="row2 pact"><button class="btn sm" data-edit="${u.id}">${ic("edit")}แก้ไข</button><button class="btn sm" data-reset="${u.id}">รีเซ็ตรหัสผ่าน</button><button class="btn sm${u.active?" danger":""}" data-act="${u.id}">${u.active?"ปิดใช้งาน":"เปิดใช้งาน"}</button></div>`:u.id===S.me?`<button class="btn sm ghost" data-go="account">บัญชีของฉัน</button>`:'<span class="muted">—</span>'}</td></tr>`).join("")}
  <tr class="pnone" hidden><td colspan="6" class="c muted">ไม่พบบัญชีที่ค้นหา</td></tr>
  </tbody></table></div></div>
  <p class="muted" style="font-size:.84rem;margin:0">${isSuper()?"แอดมินหลักจัดการได้ทุกบัญชี และแต่งตั้งแอดมินโรงเรียน (เช่น ผู้อำนวยการ หัวหน้างานวิชาการ) ได้ที่ปุ่ม \"แก้ไข\"":"แอดมินโรงเรียนสร้าง แก้ไข รีเซ็ตรหัสผ่าน และปิดการใช้งานบัญชีครูได้"} · บัญชีที่ปิดใช้งานแล้ว บันทึกเดิมยังอยู่ครบ</p>`;
  const filt=()=>{const q=$("pq").value.trim().toLowerCase(),r=$("pr").value;S.pq=$("pq").value;S.pr=r;let n=0;
    m.querySelectorAll("#pTable tbody tr[data-s]").forEach(tr=>{const ok=(!q||tr.dataset.s.includes(q))&&(!r||(r==="off"?tr.dataset.on==="0":tr.dataset.r===r&&tr.dataset.on==="1"));tr.hidden=!ok;if(ok)n++});
    m.querySelector(".pnone").hidden=n>0;$("pCount").textContent=`แสดง ${n} จาก ${us.length} บัญชี`};
  $("pq").oninput=filt;$("pr").onchange=filt;filt();
  $("pwX")&&($("pwX").onclick=()=>{S.pwNote="";render()});
  $("pAdd1").onclick=addOne;$("pAddN").onclick=()=>addMany();
  m.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editUser(user(b.dataset.edit)));
  m.querySelectorAll("[data-act]").forEach(b=>b.onclick=async()=>{const u=user(b.dataset.act),on=!u.active;
    if(!on&&!b.dataset.arm){b.dataset.arm="1";b.textContent="กดอีกครั้งเพื่อยืนยัน";setTimeout(()=>{if(b.isConnected){delete b.dataset.arm;b.textContent="ปิดใช้งาน"}},3000);return}
    b.disabled=true;try{await api("setActive",{uid:u.id,active:on});toast(on?"เปิดใช้งานแล้ว":"ปิดใช้งานแล้ว ข้อมูลบันทึกเดิมยังอยู่ครบ")}catch(e){toast(e.message);b.disabled=false}});
  m.querySelectorAll("[data-reset]").forEach(b=>b.onclick=async()=>{const u=user(b.dataset.reset),npw=tmpPw();
    if(!b.dataset.arm){b.dataset.arm="1";b.textContent="กดอีกครั้งเพื่อยืนยัน";setTimeout(()=>{if(b.isConnected){delete b.dataset.arm;b.textContent="รีเซ็ตรหัสผ่าน"}},3000);return}
    b.disabled=true;try{await api("resetPassword",{uid:u.id,password:npw})}catch(e){toast(e.message);b.disabled=false;return}
    S.pwNote=`รหัสผ่านใหม่ของ <b>${esc(u.name)}</b> (ชื่อผู้ใช้ <code>${esc(u.username)}</code>) คือ <b style="font-size:1.1em;letter-spacing:.08em">${npw}</b> แจ้งเจ้าของบัญชี แล้วให้เปลี่ยนรหัสผ่านที่เมนู "บัญชีของฉัน"`;render();window.scrollTo(0,0)});
}

function roleSel(id,val){return isSuper()?`<label class="f">สิทธิ์<select id="${id}"><option value="teacher"${val!=="admin"?" selected":""}>ครูผู้สอน</option><option value="admin"${val==="admin"?" selected":""}>แอดมินโรงเรียน</option></select></label>`:""}
function checkUsername(un,selfId){
  if(!/^[a-z0-9._-]{3,30}$/.test(un))return "ชื่อผู้ใช้ใช้ a-z 0-9 . _ - ความยาว 3–30 ตัว";
  if(D.users.some(u=>u.username===un&&u.id!==selfId))return "ชื่อผู้ใช้ "+un+" มีคนใช้แล้ว";
  return "";
}

function addOne(){
  const pt=userPattern(),sug=autoUsernames(pt.prefix,pt.width,1,new Set(D.users.map(u=>u.username)))[0];
  const b=openModal("เพิ่มบัญชีทีละคน",`<form class="stack" id="addT" novalidate><div class="grid-f">
    <label class="f wide">ชื่อ-นามสกุล<input id="pN" maxlength="80" placeholder="คำนำหน้า ชื่อ นามสกุล"></label>
    <label class="f">ตำแหน่ง<input id="pP" maxlength="80" placeholder="เช่น ครูชำนาญการ" value="ครู"></label>
    <label class="f">ชื่อผู้ใช้<input id="pU" maxlength="30" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(sug)}"></label>
    <label class="f">รหัสผ่านเริ่มต้น<input id="pW" maxlength="30" value="${tmpPw()}" autocomplete="off"></label>
    ${roleSel("pR","teacher")}
  </div><div class="actions"><button class="btn primary" type="submit">${ic("plus")}สร้างบัญชี</button><button type="button" class="btn" data-mx>ยกเลิก</button><span class="err" id="perr"></span></div></form>`);
  $("addT").addEventListener("submit",async e=>{e.preventDefault();$("perr").textContent="";const n=$("pN").value.trim(),un=$("pU").value.trim().toLowerCase(),pw=$("pW").value.trim();
    if(!n){$("perr").textContent="กรอกชื่อ-นามสกุล";$("pN").focus();return}
    const ue=checkUsername(un);if(ue){$("perr").textContent=ue;$("pU").focus();return}
    if(pw.length<6){$("perr").textContent="รหัสผ่านอย่างน้อย 6 ตัว";return}
    const btn=$("addT").querySelector("button[type=submit]");btn.disabled=true;btn.textContent="กำลังสร้าง…";
    try{await api("create",{name:n,username:un,password:pw,position:$("pP").value.trim(),role:$("pR")?$("pR").value:"teacher"})}catch(x){$("perr").textContent=x.message;btn.disabled=false;btn.innerHTML=ic("plus")+"สร้างบัญชี";return}
    closeModal(true);S.pwNote=`สร้างบัญชี <b>${esc(n)}</b> แล้ว · ชื่อผู้ใช้ <code>${esc(un)}</code> รหัสผ่าน <b style="letter-spacing:.06em">${esc(pw)}</b>`;S.pq="";S.pr="";render();window.scrollTo(0,0)});
}

function editUser(u){
  if(!u)return;
  openModal("แก้ไขข้อมูลบัญชี",`<form class="stack" id="eu" novalidate><div class="grid-f">
    <label class="f wide">ชื่อ-นามสกุล<input id="eN" maxlength="80" value="${esc(u.name)}"></label>
    <label class="f">ตำแหน่ง<input id="eP" maxlength="80" value="${esc(u.position)}"></label>
    <label class="f">ชื่อผู้ใช้<input id="eU" maxlength="30" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(u.username)}"></label>
    ${roleSel("eR",u.role)}
  </div><p class="muted" id="eHint" style="margin:0;font-size:.86rem" hidden>เปลี่ยนชื่อผู้ใช้แล้ว ต้องแจ้งเจ้าของบัญชีให้เข้าสู่ระบบด้วยชื่อผู้ใช้ใหม่ (รหัสผ่านเดิมยังใช้ได้)</p>
  <p class="muted" style="margin:0;font-size:.86rem">บันทึกหลังสอนที่ส่งไปแล้วจะคงชื่อตามที่ครูกรอกไว้ในแต่ละฉบับ</p>
  <div class="actions"><button class="btn primary" type="submit">${ic("check")}บันทึกการแก้ไข</button><button type="button" class="btn" data-mx>ยกเลิก</button><span class="err" id="eerr"></span></div></form>`);
  $("eU").oninput=()=>{$("eHint").hidden=$("eU").value.trim().toLowerCase()===u.username};
  $("eu").addEventListener("submit",async e=>{e.preventDefault();$("eerr").textContent="";
    const n=$("eN").value.trim(),p=$("eP").value.trim(),un=$("eU").value.trim().toLowerCase(),r=$("eR")?$("eR").value:u.role;
    if(!n){$("eerr").textContent="กรอกชื่อ-นามสกุล";return}
    const ue=checkUsername(un,u.id);if(ue){$("eerr").textContent=ue;return}
    if(n===u.name&&p===(u.position||"")&&un===u.username&&r===u.role){closeModal(true);return}
    const btn=$("eu").querySelector("button[type=submit]");btn.disabled=true;btn.textContent="กำลังบันทึก…";
    try{await api("update",{uid:u.id,name:n,position:p,username:un,role:r})}catch(x){$("eerr").textContent=x.message;btn.disabled=false;btn.innerHTML=ic("check")+"บันทึกการแก้ไข";return}
    closeModal(true);
    if(un!==u.username){S.pwNote=`แก้ไขบัญชี <b>${esc(n)}</b> แล้ว · ชื่อผู้ใช้ใหม่คือ <code>${esc(un)}</code> แจ้งเจ้าของบัญชีด้วย (รหัสผ่านเดิมใช้ได้)`;render();window.scrollTo(0,0)}
    else toast("บันทึกการแก้ไขแล้ว")});
}

// เพิ่มหลายคนพร้อมกัน: กรอกเป็นตาราง หรือคัดลอกจาก Excel / Google Sheets มาวาง
function addMany(seed){
  const pt=userPattern(),sup=isSuper();
  let rows=(seed&&seed.length?seed:Array.from({length:5},()=>({}))).map(r=>({name:"",position:"",username:"",password:"",role:"teacher",...r}));
  const cols=["name","position","username","password"];
  const body=openModal("เพิ่มบัญชีหลายคน",`<div class="stack bulk">
    <div class="banner" style="margin:0">${ic("info")}<div>พิมพ์ทีละแถว หรือ<b>คัดลอกจาก Excel / Google Sheets มาวางที่ช่องชื่อ</b>ได้ทีเดียวหลายคน (เรียงคอลัมน์: ชื่อ-นามสกุล · ตำแหน่ง · ชื่อผู้ใช้ · รหัสผ่าน) ช่องที่เว้นว่าง ระบบตั้งให้อัตโนมัติ</div></div>
    <div class="grid-f">
      <label class="f">ชื่อผู้ใช้ขึ้นต้นด้วย<input id="bPre" maxlength="20" autocapitalize="none" spellcheck="false" value="${esc(pt.prefix)}"></label>
      <label class="f">ตำแหน่ง (ใช้กับแถวที่เว้นว่าง)<input id="bPos" maxlength="80" value="ครู"></label>
    </div>
    <div class="bgrid${sup?" sup":""}" id="bGrid"></div>
    <div class="row2" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn sm" id="bAdd">${ic("plus")}เพิ่ม 1 แถว</button><button type="button" class="btn sm" id="bAdd5">${ic("plus")}เพิ่ม 5 แถว</button><span class="sp"></span><span class="muted" id="bCnt"></span></div>
    <div class="actions"><button type="button" class="btn primary" id="bGo">${ic("plus")}สร้างบัญชีทั้งหมด</button><button type="button" class="btn" data-mx>ยกเลิก</button><span class="err" id="berr"></span></div>
  </div>`,{wide:true,keep:true});
  const md=$("modal");
  const plan=()=>{const pre=($("bPre").value.trim().toLowerCase().replace(/[^a-z0-9._-]/g,""))||"teacher";
    const taken=new Set([...D.users.map(u=>u.username),...rows.map(r=>r.username.trim().toLowerCase()).filter(Boolean)]);
    const need=rows.filter(r=>r.name.trim()&&!r.username.trim()).length,auto=autoUsernames(pre,pt.prefix===pre?pt.width:3,need,taken);let i=0;
    return rows.map(r=>r.name.trim()&&!r.username.trim()?auto[i++]:"")};
  const hint=()=>{const a=plan();body.querySelectorAll("[data-c=username]").forEach(inp=>{const k=+inp.dataset.i;inp.placeholder=a[k]?a[k]+" (อัตโนมัติ)":"อัตโนมัติ"});
    const n=rows.filter(r=>r.name.trim()).length;$("bCnt").textContent=n?`พร้อมสร้าง ${n} บัญชี`:"";};
  const draw=()=>{$("bGrid").innerHTML=`<div class="bh"><span>#</span><span>ชื่อ-นามสกุล</span><span>ตำแหน่ง</span><span>ชื่อผู้ใช้</span><span>รหัสผ่าน</span>${sup?"<span>สิทธิ์</span>":""}<span></span></div>`+rows.map((r,i)=>`<div class="br" data-row="${i}"><span class="bn">${i+1}</span>
      <input data-i="${i}" data-c="name" maxlength="80" value="${esc(r.name)}" placeholder="คำนำหน้า ชื่อ นามสกุล" aria-label="ชื่อ-นามสกุล แถว ${i+1}">
      <input data-i="${i}" data-c="position" maxlength="80" value="${esc(r.position)}" placeholder="ตามค่าด้านบน" aria-label="ตำแหน่ง แถว ${i+1}">
      <input data-i="${i}" data-c="username" maxlength="30" autocapitalize="none" autocomplete="off" spellcheck="false" value="${esc(r.username)}" aria-label="ชื่อผู้ใช้ แถว ${i+1}">
      <input data-i="${i}" data-c="password" maxlength="30" autocomplete="off" value="${esc(r.password)}" placeholder="สุ่มให้" aria-label="รหัสผ่าน แถว ${i+1}">
      ${sup?`<select data-i="${i}" data-c="role" aria-label="สิทธิ์ แถว ${i+1}"><option value="teacher"${r.role!=="admin"?" selected":""}>ครูผู้สอน</option><option value="admin"${r.role==="admin"?" selected":""}>แอดมินโรงเรียน</option></select>`:""}
      <button type="button" class="btn sm ghost bdel" data-del="${i}" aria-label="ลบแถว ${i+1}" title="ลบแถว">${ic("trash")}</button>${r.err?`<span class="berr">${esc(r.err)}</span>`:""}</div>`).join("");
    hint()};
  draw();
  body.addEventListener("input",e=>{const t=e.target;if(t.dataset.c){rows[+t.dataset.i][t.dataset.c]=t.value;md.dataset.dirty="1";hint()}else if(t.id==="bPre")hint()});
  body.addEventListener("change",e=>{const t=e.target;if(t.dataset.c==="role")rows[+t.dataset.i].role=t.value});
  body.addEventListener("paste",e=>{const t=e.target;if(!t.dataset||!t.dataset.c||t.dataset.c==="role")return;
    const txt=(e.clipboardData||window.clipboardData).getData("text");if(!/[\t\n]/.test(txt.trim()))return;e.preventDefault();
    const lines=txt.replace(/\r/g,"").split("\n").filter(l=>l.trim());const r0=+t.dataset.i,c0=cols.indexOf(t.dataset.c);
    lines.forEach((l,k)=>{const cells=l.split("\t");if(!rows[r0+k])rows[r0+k]={name:"",position:"",username:"",password:"",role:"teacher"};
      cells.forEach((v,j)=>{const c=cols[c0+j];if(c)rows[r0+k][c]=v.trim()})});
    if(rows.length>100)rows=rows.slice(0,100);md.dataset.dirty="1";draw();toast(`วาง ${lines.length} แถวแล้ว`)});
  body.addEventListener("click",e=>{const d=e.target.closest("[data-del]");if(!d)return;rows.splice(+d.dataset.del,1);if(!rows.length)rows.push({name:"",position:"",username:"",password:"",role:"teacher"});draw()});
  $("bAdd").onclick=()=>{if(rows.length>=100)return toast("เพิ่มได้ครั้งละไม่เกิน 100 คน");rows.push({name:"",position:"",username:"",password:"",role:"teacher"});draw();body.querySelector(`[data-i="${rows.length-1}"][data-c=name]`).focus()};
  $("bAdd5").onclick=()=>{for(let k=0;k<5&&rows.length<100;k++)rows.push({name:"",position:"",username:"",password:"",role:"teacher"});draw()};
  $("bGo").onclick=async()=>{$("berr").textContent="";rows.forEach(r=>delete r.err);
    const auto=plan(),pos=$("bPos").value.trim(),seen=new Set();let bad=0;
    const list=[];rows.forEach((r,i)=>{const any=cols.some(c=>r[c].trim());if(!any)return;
      const it={i,name:r.name.trim(),position:r.position.trim()||pos,username:(r.username.trim()||auto[i]||"").toLowerCase(),password:r.password.trim()||tmpPw(),role:sup&&r.role==="admin"?"admin":"teacher"};
      let er=!it.name?"ยังไม่ได้กรอกชื่อ":checkUsername(it.username)||(seen.has(it.username)?"ชื่อผู้ใช้ซ้ำกับแถวอื่น":"")||(it.password.length<6?"รหัสผ่านอย่างน้อย 6 ตัว":"");
      seen.add(it.username);if(er){r.err=er;bad++}else list.push(it)});
    if(bad){draw();$("berr").textContent=`มี ${bad} แถวที่ต้องแก้ (ดูข้อความสีแดงใต้แถว)`;return}
    if(!list.length){$("berr").textContent="กรอกชื่ออย่างน้อย 1 คน";return}
    const go=$("bGo");go.disabled=true;body.querySelectorAll("input,select,button").forEach(x=>x.disabled=true);
    const res=[];for(let k=0;k<list.length;k+=5){const part=list.slice(k,k+5);go.textContent=`กำลังสร้าง ${Math.min(k+5,list.length)}/${list.length}…`;
      try{const j=await api("createMany",{list:part.map(({i,...x})=>x)});part.forEach((p,q)=>res.push({...p,...(j.results&&j.results[q]||{ok:false,error:"ไม่ทราบผล"})}))}
      catch(x){part.forEach(p=>res.push({...p,ok:false,error:x.message}))}}
    md.dataset.dirty="1";showBulkResult(res)};
}
function showBulkResult(res){
  const ok=res.filter(r=>r.ok),no=res.filter(r=>!r.ok);
  const body=$("mBody");$("mTitle").textContent="ผลการสร้างบัญชี";
  body.innerHTML=`<div class="stack">
    <div class="row2" style="gap:8px"><span class="chip good" style="font-size:.95rem;padding:6px 12px">สร้างสำเร็จ ${ok.length} บัญชี</span>${no.length?`<span class="chip bad" style="font-size:.95rem;padding:6px 12px">ไม่สำเร็จ ${no.length} บัญชี</span>`:""}</div>
    ${ok.length?`<div class="banner" style="margin:0;background:var(--gold-soft)">${ic("info")}<div><b>รหัสผ่านแสดงเฉพาะหน้านี้ครั้งเดียว</b> ดาวน์โหลดหรือคัดลอกเก็บไว้ก่อนปิด แล้วแจ้งครูแต่ละคน</div></div>`:""}
    <div class="tw"><table class="t"><thead><tr><th>ชื่อ-นามสกุล</th><th>ชื่อผู้ใช้</th><th>รหัสผ่าน</th><th class="c">สถานะ</th></tr></thead><tbody>
    ${res.map(r=>`<tr><td class="nw">${esc(r.name)}</td><td><code>${esc(r.username)}</code></td><td><b style="letter-spacing:.05em">${r.ok?esc(r.password):"—"}</b></td><td class="c">${r.ok?'<span class="chip good">สำเร็จ</span>':`<span class="chip bad">${esc(r.error||"ไม่สำเร็จ")}</span>`}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="actions">${ok.length?`<button class="btn primary" id="rCsv">${ic("pdf")}ดาวน์โหลดรายชื่อ (CSV)</button><button class="btn" id="rCopy">${ic("copy")}คัดลอก</button>`:""}${no.length?`<button class="btn" id="rFix">${ic("edit")}แก้แถวที่ไม่สำเร็จ</button>`:""}<button class="btn" id="rDone">ปิด</button></div></div>`;
  const txt=ok.map(r=>`${r.name}\tชื่อผู้ใช้: ${r.username}\tรหัสผ่าน: ${r.password}`).join("\n");
  $("rCsv")&&($("rCsv").onclick=()=>{saveText("บัญชีผู้ใช้ใหม่_"+TODAY+".csv",[["ชื่อ-นามสกุล","ตำแหน่ง","ชื่อผู้ใช้","รหัสผ่าน","สิทธิ์"],...ok.map(r=>[r.name,r.position,r.username,r.password,ROLE[r.role]])]);delete $("modal").dataset.dirty});
  $("rCopy")&&($("rCopy").onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast("คัดลอกแล้ว");delete $("modal").dataset.dirty}catch(e){toast("คัดลอกไม่ได้ ใช้ปุ่มดาวน์โหลดแทน")}});
  $("rFix")&&($("rFix").onclick=()=>addMany(no.map(r=>({name:r.name,position:r.position,username:r.username,password:r.password,role:r.role,err:r.error}))));
  $("rDone").onclick=()=>closeModal();
  if(ok.length){S.pq="";S.pr="";S.pwNote=`สร้างบัญชีใหม่แล้ว ${ok.length} บัญชี`;render()}
}

// ---------- view: settings (admin)
function vSettings(m){
  if(!isAdmin()){go("logs");return}
  const s=D.settings,[ct,cy]=curTerm().split("/"),nx=nextChange(),auto=s.termMode==="auto";
  const dsel=(id,v)=>`<select id="${id}" aria-label="วันที่">${Array.from({length:31},(_,i)=>i+1).map(n=>`<option${+v===n?" selected":""}>${n}</option>`).join("")}</select>`;
  const msel=(id,v)=>`<select id="${id}" aria-label="เดือน">${MONTHS.map((x,i)=>`<option value="${pad(i+1)}"${+v===i+1?" selected":""}>${x}</option>`).join("")}</select>`;
  m.innerHTML=`<form class="card gold stack" id="sf1"><h2>ข้อมูลโรงเรียน</h2><div class="grid-f">
    <label class="f wide">ชื่อโรงเรียน<input id="sSch" value="${esc(s.school)}"></label>
    ${isSuper()?`<label class="f wide">เครดิตผู้พัฒนาระบบ (แสดงท้ายหน้าเข้าสู่ระบบ · แก้ได้เฉพาะแอดมินหลัก)<input id="sCr" maxlength="120" value="${esc(s.credit)}"></label>`:""}</div>
    <div class="actions"><button class="btn primary" type="submit">บันทึกข้อมูลโรงเรียน</button></div></form>
  <form class="card gold stack" id="sf2"><h2>ภาคเรียนและปีการศึกษา</h2>
    <p class="muted" style="margin:0">ตอนนี้: <b style="color:var(--accent)">ภาคเรียนที่ ${esc(ct)} ปีการศึกษา ${esc(cy)}</b> · ครูเขียนและแก้ไขบันทึกได้เฉพาะภาคเรียนปัจจุบัน ภาคเรียนก่อน ๆ เปิดดูและดาวน์โหลดได้ตลอด</p>
    <div class="seg" style="grid-template-columns:1fr 1fr" role="radiogroup" aria-label="วิธีเปลี่ยนภาคเรียน">
      <label><input type="radio" name="tmode" value="auto"${auto?" checked":""}><span>เปลี่ยนอัตโนมัติตามวันที่</span></label>
      <label><input type="radio" name="tmode" value="manual"${auto?"":" checked"}><span>กำหนดเอง</span></label></div>
    <div id="tAuto" class="stack"${auto?"":" hidden"}>
      <div class="grid-f" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))"><div class="f"><span>วันเปิดภาคเรียนที่ 1</span><div class="dm">${dsel("a1d",s.t1Start.slice(3))}${msel("a1m",s.t1Start.slice(0,2))}</div></div>
        <div class="f"><span>วันเปิดภาคเรียนที่ 2</span><div class="dm">${dsel("a2d",s.t2Start.slice(3))}${msel("a2m",s.t2Start.slice(0,2))}</div></div></div>
      <div class="banner">${ic("info")}<div>ปีการศึกษาเปลี่ยนเองเมื่อถึงวันเปิดภาคเรียนที่ 1 ${auto?`· ครั้งถัดไประบบจะเปลี่ยนเป็น<b>ภาคเรียนที่ ${esc(nx.term)}</b> ในวันที่ ${esc(thaiDate(nx.date))}`:""}</div></div></div>
    <div id="tMan"${auto?" hidden":""}><div class="grid-f"><label class="f">ภาคเรียนที่<select id="nT"><option${ct==="1"?" selected":""}>1</option><option${ct==="2"?" selected":""}>2</option></select></label>
      <label class="f">ปีการศึกษา (พ.ศ.)<input id="nY" inputmode="numeric" maxlength="4" value="${esc(cy)}"></label></div></div>
    <div class="actions"><button class="btn gold" type="submit">บันทึกการตั้งค่าภาคเรียน</button><span class="err" id="serr"></span></div>
    <div class="confirm" id="tConf" hidden></div></form>
  <form class="card gold stack" id="sf3"><h2>กำหนดการส่งบันทึกหลังสอน</h2>
    <p class="muted" style="margin:0">ใช้คำนวณสถานะ "ส่งแล้ว / ยังไม่ส่ง / เลยกำหนด" ในหน้าหลักและหน้าติดตามการส่ง</p>
    <div class="grid-f">
      <label class="f">รอบการส่ง<select id="dF">${Object.entries(FREQ).map(([k,v])=>`<option value="${k}"${(s.dueFreq||"week")===k?" selected":""}>${v}</option>`).join("")}</select></label>
      <label class="f" id="dDw">ส่งภายในวัน<select id="dD">${WD.map((w,i)=>`<option value="${i+1}"${+(s.dueDay||5)===i+1?" selected":""}>${w}</option>`).join("")}</select></label>
      <label class="f">จำนวนขั้นต่ำต่อรอบ (ฉบับ)<input id="dM" type="number" min="1" max="50" inputmode="numeric" value="${esc(s.dueMin||1)}"></label>
    </div>
    <div class="banner" id="dPrev">${ic("info")}<div></div></div>
    <div class="actions"><button class="btn gold" type="submit">บันทึกกำหนดการส่ง</button><span class="err" id="derr"></span></div></form>`;
  $("sf1").addEventListener("submit",e=>{e.preventDefault();const p={school:$("sSch").value.trim()};if($("sCr"))p.credit=$("sCr").value.trim();saveSettings(p,"บันทึกข้อมูลโรงเรียนแล้ว")});
  m.querySelectorAll('input[name="tmode"]').forEach(r=>r.onchange=()=>{const a=r.value==="auto";$("tAuto").hidden=!a;$("tMan").hidden=a});
  $("sf2").addEventListener("submit",e=>{e.preventDefault();$("serr").textContent="";const mode=m.querySelector('input[name="tmode"]:checked').value;
    if(mode==="auto"){const t1=$("a1m").value+"-"+pad($("a1d").value),t2=$("a2m").value+"-"+pad($("a2d").value);
      if(t1>=t2){$("serr").textContent="วันเปิดภาคเรียนที่ 2 ต้องอยู่หลังภาคเรียนที่ 1 ในปีเดียวกัน";return}
      saveSettings({termMode:"auto",t1Start:t1,t2Start:t2},"ระบบจะเปลี่ยนภาคเรียนและปีการศึกษาอัตโนมัติ");return}
    const t=$("nT").value+"/"+$("nY").value.trim();
    if(!/^[12]\/25\d\d$/.test(t)){$("serr").textContent="ปีการศึกษาต้องเป็น พ.ศ. 4 หลัก เช่น 2570";return}
    const c=$("tConf");c.hidden=false;c.innerHTML=`<span>ใช้<b>ภาคเรียนที่ ${esc(t)}</b>เป็นภาคเรียนปัจจุบัน และหยุดการเปลี่ยนอัตโนมัติ?</span><button type="button" class="btn sm primary" id="tYes">ยืนยัน</button><button type="button" class="btn sm" id="tNo">ยกเลิก</button>`;
    $("tNo").onclick=()=>c.hidden=true;$("tYes").onclick=()=>saveSettings({termMode:"manual",currentTerm:t},"ตั้งเป็นภาคเรียนที่ "+t+" แล้ว")});
  const dPrev=()=>{const tmp={...D.settings};D.settings.dueFreq=$("dF").value;D.settings.dueDay=+$("dD").value;D.settings.dueMin=Math.max(1,+$("dM").value||1);
    const c=cycleOf(TODAY);$("dDw").hidden=$("dF").value==="month";
    $("dPrev").lastElementChild.innerHTML=`ตัวอย่าง: ${esc(c.label)} ครูต้องส่งอย่างน้อย <b>${D.settings.dueMin} ฉบับ</b> ภายใน<b>${esc(dueTxt(c))}</b>${$("dF").value==="month"?" (วันสุดท้ายของเดือน)":""}`;
    Object.assign(D.settings,tmp)};
  ["dF","dD","dM"].forEach(id=>$(id).addEventListener("input",dPrev));dPrev();
  $("sf3").addEventListener("submit",e=>{e.preventDefault();const n=parseInt($("dM").value,10);if(!(n>=1&&n<=50)){$("derr").textContent="จำนวนขั้นต่ำ 1–50 ฉบับ";return}
    persistSettings({dueFreq:$("dF").value,dueDay:+$("dD").value,dueMin:n},"บันทึกกำหนดการส่งแล้ว")});
}

// ---------- view: account
function vAccount(m){
  const u=me(),mine=D.logs.filter(l=>l.authorId===u.id);
  m.innerHTML=`<div class="stack center-col">
  <form class="card gold stack" id="af"><h2>${esc(u.name)}</h2><div class="muted">${u.google?`เข้าสู่ระบบด้วยบัญชี Google <code>${esc(u.google)}</code>`:`ชื่อผู้ใช้ <code>${esc(u.username)}</code>`} · <span class="chip ${u.role==="teacher"?"":"gold"}">${ROLE[u.role]}</span></div>
    <div class="grid-f"><label class="f wide">ชื่อ-นามสกุล (ใช้ลงชื่อในเอกสาร)<input id="aN" value="${esc(u.name)}"></label><label class="f wide">ตำแหน่ง<input id="aP" value="${esc(u.position)}"></label></div>
    <div class="actions"><button class="btn primary" type="submit">บันทึกข้อมูล</button><span class="sp"></span><button class="btn" type="button" id="aOut">${ic("logout")}ออกจากระบบ</button></div></form>
  <div class="card gold stack"><h2>ลายเซ็นของฉัน</h2><p class="muted" style="margin:0">วาดด้วยนิ้วหรือเมาส์ในกรอบ หรือแนบรูปถ่ายลายเซ็นบนกระดาษขาว ระบบจะตัดพื้นขาวออกให้ แล้วใส่ลงในช่อง "ลงชื่อ" ของเอกสารอัตโนมัติ</p>
    <canvas id="pad" class="pad" width="600" height="200" aria-label="กรอบวาดลายเซ็น"></canvas>
    <div class="actions"><button class="btn" type="button" id="padClr">ล้าง</button><label class="btn filebtn">${ic("pdf")}แนบรูปลายเซ็น<input type="file" id="padFile" accept="image/png,image/jpeg,image/webp,image/heic" aria-label="แนบรูปลายเซ็น"></label><button class="btn primary" type="button" id="padSave">บันทึกลายเซ็น</button>${u.sig?`<button class="btn danger" type="button" id="padDel">ลบลายเซ็น</button>`:""}</div></div>
  ${u.google?"":`<form class="card gold stack" id="pwf"><h2>เปลี่ยนรหัสผ่าน</h2><div class="grid-f">
    <label class="f">รหัสผ่านเดิม<input id="p0" type="password" autocomplete="current-password"></label>
    <label class="f">รหัสผ่านใหม่<input id="p1" type="password" autocomplete="new-password"></label>
    <label class="f">ยืนยันรหัสผ่านใหม่<input id="p2" type="password" autocomplete="new-password"></label></div>
    <div class="actions"><button class="btn primary" type="submit">เปลี่ยนรหัสผ่าน</button><span class="err" id="pwerr"></span></div></form>`}
  <div class="tiles"><div><b>${mine.length}</b><span>บันทึกภาคเรียนนี้</span></div><div><b>${new Set(D.assigns.filter(a=>a.teacherId===u.id).map(a=>a.term)).size}</b><span>ภาคเรียนที่สอน</span></div><div><b>${D.assigns.filter(a=>a.teacherId===u.id).length}</b><span>รายวิชา</span></div><div><b>${mine.filter(l=>reviewed(l.id)).length}</b><span>ลงนามแล้ว</span></div></div>
  <p class="muted" style="text-align:center;font-size:.8rem;margin:4px 0 0">${esc(D.settings.school)} · ${esc(D.settings.credit)}</p></div>`;
  $("aOut").onclick=logout;
  $("af").addEventListener("submit",e=>{e.preventDefault();updateDoc(doc(db,"users",u.id),{name:$("aN").value.trim()||u.name,position:$("aP").value.trim()}).then(()=>{toast("บันทึกข้อมูลแล้ว");render()}).catch(x=>toast(fsMsg(x)))});
  const cv=$("pad"),g=cv.getContext("2d");let drawing=false,dirty=false;
  g.lineWidth=5;g.lineCap="round";g.lineJoin="round";g.strokeStyle="#1b2a6b";
  if(u.sig){const im=new Image();im.onload=()=>g.drawImage(im,0,0,600,200);im.src=u.sig}
  const pt=e=>{const r=cv.getBoundingClientRect();return[(e.clientX-r.left)*600/r.width,(e.clientY-r.top)*200/r.height]};
  cv.addEventListener("pointerdown",e=>{drawing=true;dirty=true;cv.setPointerCapture(e.pointerId);const[x,y]=pt(e);g.beginPath();g.moveTo(x,y);g.lineTo(x+.1,y+.1);g.stroke()});
  cv.addEventListener("pointermove",e=>{if(!drawing)return;const[x,y]=pt(e);g.lineTo(x,y);g.stroke()});
  ["pointerup","pointercancel","pointerleave"].forEach(t=>cv.addEventListener(t,()=>drawing=false));
  $("padFile").onchange=e=>{const f=e.target.files&&e.target.files[0];if(!f)return;if(f.size>8e6){toast("ไฟล์ใหญ่เกิน 8 MB");return}
    const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{
      const tc=document.createElement("canvas"),W=Math.min(1600,im.width),H=Math.round(im.height*W/im.width);tc.width=W;tc.height=H;const tg=tc.getContext("2d");tg.drawImage(im,0,0,W,H);
      const d=tg.getImageData(0,0,W,H),p=d.data;let x0=W,y0=H,x1=0,y1=0;
      for(let i=0;i<p.length;i+=4){const lum=.299*p[i]+.587*p[i+1]+.114*p[i+2];const a=lum>200?0:lum<120?255:Math.round((200-lum)/80*255);
        p[i]=27;p[i+1]=42;p[i+2]=107;p[i+3]=Math.min(p[i+3],a);if(p[i+3]>40){const px=(i/4)%W,py=Math.floor(i/4/W);if(px<x0)x0=px;if(px>x1)x1=px;if(py<y0)y0=py;if(py>y1)y1=py}}
      if(x1<=x0||y1<=y0){toast("ไม่พบลายเซ็นในรูป ลองถ่ายบนกระดาษขาวให้ชัดขึ้น");return}
      tg.putImageData(d,0,0);const bw=x1-x0+1,bh=y1-y0+1,k=Math.min(560/bw,180/bh);
      g.clearRect(0,0,600,200);g.drawImage(tc,x0,y0,bw,bh,(600-bw*k)/2,(200-bh*k)/2,bw*k,bh*k);dirty=true;toast("แนบรูปแล้ว ตรวจดูในกรอบ แล้วกดบันทึกลายเซ็น")};
      im.onerror=()=>toast("เปิดรูปนี้ไม่ได้ ใช้ไฟล์ JPG หรือ PNG");im.src=rd.result};rd.readAsDataURL(f);e.target.value=""};
  $("padClr").onclick=()=>{g.clearRect(0,0,600,200);dirty=true;u._clr=true};
  $("padSave").onclick=()=>{if(!dirty&&!u.sig){toast("วาดลายเซ็นในกรอบก่อน");return}updateDoc(doc(db,"users",u.id),{sig:cv.toDataURL("image/png")}).then(()=>{toast("บันทึกลายเซ็นแล้ว");render()}).catch(x=>toast(fsMsg(x)))};
  $("padDel")&&($("padDel").onclick=()=>{updateDoc(doc(db,"users",u.id),{sig:""}).then(()=>{toast("ลบลายเซ็นแล้ว");render()}).catch(x=>toast(fsMsg(x)))});
  $("pwf")&&$("pwf").addEventListener("submit",async e=>{e.preventDefault();const er=$("pwerr");er.textContent="";
    if(!$("p0").value){er.textContent="กรอกรหัสผ่านเดิม";return}
    if($("p1").value.length<6){er.textContent="รหัสผ่านใหม่อย่างน้อย 6 ตัว";return}
    if($("p1").value!==$("p2").value){er.textContent="ยืนยันรหัสผ่านไม่ตรงกัน";return}
    try{const cu=auth.currentUser;await reauthenticateWithCredential(cu,EmailAuthProvider.credential(cu.email,$("p0").value));await updatePassword(cu,$("p1").value);toast("เปลี่ยนรหัสผ่านแล้ว");render()}
    catch(x){er.textContent=/wrong-password|invalid-credential/.test(x.code||"")?"รหัสผ่านเดิมไม่ถูกต้อง":/too-many/.test(x.code||"")?"ลองผิดหลายครั้ง รอสักครู่แล้วลองใหม่":"เปลี่ยนรหัสผ่านไม่สำเร็จ"}});
}

// ---------- A4 sheet builder (lines are wrapped here so screen and PDF match)
const CW=624;let mctx=null;
const segW=typeof Intl!=="undefined"&&Intl.Segmenter?new Intl.Segmenter("th",{granularity:"word"}):null;
const segG=typeof Intl!=="undefined"&&Intl.Segmenter?new Intl.Segmenter("th",{granularity:"grapheme"}):null;
function mw(t,bold){if(!mctx)mctx=document.createElement("canvas").getContext("2d");mctx.font=(bold?"700 ":"400 ")+"14.5px Sarabun, 'Leelawadee UI', Tahoma, sans-serif";return mctx.measureText(t).width}
const toks=t=>segW?[...segW.segment(t)].map(s=>s.segment):t.split(/(\s+)/);
const graphemes=t=>segG?[...segG.segment(t)].map(s=>s.segment):Array.from(t);
function wrap(text,first,rest){
  const lines=[];
  String(text??"").split("\n").forEach(p=>{let line="";
    for(let tk of toks(p)){const lim=lines.length?rest:first;
      if(mw(line+tk)<=lim){line+=tk;continue}
      if(line.trim()){lines.push(line);line="";tk=tk.replace(/^\s+/,"")}
      const lim2=lines.length?rest:first;
      if(mw(tk)>lim2){const g=graphemes(tk);let cur="";for(const ch of g){if(mw(cur+ch)>(lines.length?rest:first)){lines.push(cur);cur=""}cur+=ch}tk=cur}
      line=tk}
    lines.push(line)});
  return lines;
}
const reviewSig=r=>user(r.by).sig||"";
const fi=(v,w)=>`<span class="fi" style="min-width:${w}px">${esc(thd(v))||"&nbsp;"}</span>`;
const bx=on=>`<span class="bx${on?" on":""}"></span>`;
const ln=(html,ind)=>`<div class="ln" style="padding-left:${ind||0}px">${html}</div>`;
// แผ่น A4 = 794×1120px · พื้นที่เนื้อหาต่อหน้า (หักขอบบน-ล่าง และบรรทัดเลขหน้า)
const PAGE_BODY=1120-62-56-6-28;
function paraLines(label,value,o){o=o||{};const ind=o.ind||0,bold=o.bold!==false,hasBox=o.box!==undefined;
  const lw=(hasBox?22:0)+(label?mw(label,bold)+4:0);
  let ls=String(value||"").trim()?wrap(thd(value),CW-ind-lw-14,CW-ind-10):[];
  while(ls.length<(o.min||1))ls.push("");
  return ls.map((t,i)=>ln((i===0?(hasBox?bx(o.box):"")+(label?`<span class="${bold?"b":""}">${esc(label)}</span>`:""):"")+`<span class="dl">${esc(t)||" "}</span>`,ind));
}
function para(label,value,o){return paraLines(label,value,o).join("")}
function sign(name,pos,date,sig){const d=dp(date);
  return `<div class="sig">${ln("ลงชื่อ"+`<span class="fi sigl" style="min-width:200px">${sig?`<img src="${sig}" alt="">`:""}&nbsp;</span>`)}${ln("("+fi(name,200)+")")}${ln("ตำแหน่ง"+fi(pos,180))}${ln("วันที่"+fi(d?d.d:"",36)+"เดือน"+fi(d?d.m:"",100)+"พ.ศ."+fi(d?d.y:"",56))}</div>`}
// แบ่งหน้า: หัวข้อไม่ค้างท้ายหน้า, ช่องลงชื่อไม่ถูกตัดครึ่ง, ส่วนความเห็นผู้บริหารพยายามอยู่หน้าเดียวกัน
function paginate(items,cont){
  const pages=[[]];let used=0;
  const push=x=>{pages[pages.length-1].push(x);used+=x.h};
  const newPage=()=>{pages.push([]);used=0;if(cont)push({html:cont,h:30})};
  items.forEach((it,i)=>{
    if(it.group){const gh=it.group.reduce((s,x)=>s+x.h,0);
      if(used+gh>PAGE_BODY&&gh<=PAGE_BODY-30&&used>0)newPage();
      it.group.forEach((x,j)=>{const nx=x.kn&&it.group[j+1]?it.group[j+1].h:0;if(used+x.h+nx>PAGE_BODY&&used>30)newPage();push(x)});return}
    const nxt=items[i+1],nh=it.kn&&nxt?(nxt.group?nxt.group[0].h:nxt.h):0;
    if(used+it.h+nh>PAGE_BODY&&used>30)newPage();
    push(it);
  });
  return pages;
}
function wrapPages(pages,cls){const n=pages.length;
  return pages.map((p,i)=>`<div class="sheet${cls&&i===0?" "+cls:""}"><span class="tag">${esc(D.settings.school)}</span>${p.map(x=>x.html).join("")}${n>1?`<span class="pno">หน้า ${thd(i+1)}/${thd(n)}</span>`:""}</div>`)}
function sheetPages(l){
  const kg=l.level==="อนุบาล",r=D.reviews[l.id]||{},t=+l.total||0,ps=+l.pass||0,f=t-ps,P=x=>t?fmtPct(x/t*100):"";
  const it=[],L=(html,ind,kn)=>it.push({html:ln(html,ind),h:24,kn:!!kn}),PL=(a,b,o)=>paraLines(a,b,o).forEach(x=>it.push({html:x,h:24}));
  const t1=kg?"บันทึกผลหลังแผนการจัดประสบการณ์ ชั้น":"บันทึกผลหลังแผนการจัดการเรียนรู้รายวิชา",v1=kg?l.cls:l.subject,dt=thaiDate(l.date);
  const hw=mw(t1,true)+Math.max(kg?70:120,mw(thd(v1))+12)+mw("(วันที่",true)+Math.max(140,mw(thd(dt))+12)+mw(")",true)+24;
  it.push({html:ln(`<span class="b">${t1}</span>${fi(v1,kg?70:120)}<span class="b">(วันที่</span>${fi(dt,140)}<span class="b">)</span>`),h:hw>CW?48:24});
  L(kg?`ภาคเรียนที่${fi(l.term,70)}คาบที่${fi(l.period,40)}`:`รหัสวิชา${fi(l.code,70)}ชั้น${fi(l.cls,60)}คาบที่${fi(l.period,36)}ภาคเรียนที่${fi(l.term,70)}`,32);
  PL(`หน่วยการ${kg?"จัดประสบการณ์":"เรียนรู้"}ที่ ${thd(l.unitNo)}`,l.unitName,{ind:32});
  PL(`แผนการจัด${kg?"ประสบการณ์":"การเรียนรู้"}ที่ ${thd(l.planNo)} เรื่อง`,l.topic,{ind:32});
  L(`<span class="bi">${kg?"ผลการจัดประสบการณ์":"ผลการจัดกิจกรรมการเรียนรู้"}</span>`,32,true);
  L(bx(true)+"จำนวนนักเรียนที่ผ่านการประเมิน"+fi(ps,70)+"คน คิดเป็นร้อยละ"+fi(P(ps),80),56);
  L(bx(f>0)+"จำนวนนักเรียนที่ไม่ผ่านการประเมิน"+fi(f,62)+"คน คิดเป็นร้อยละ"+fi(f?P(f):"",80),56);
  if(l.failList)PL("นักเรียนที่ไม่ผ่าน",l.failList,{ind:56,bold:false});
  if(kg){PL("ด้านร่างกาย",l.dBody,{ind:56});PL("ด้านอารมณ์ จิตใจ",l.dEmo,{ind:56});PL("ด้านสังคม",l.dSoc,{ind:56});PL("ด้านสติปัญญา",l.dInt,{ind:56})}
  else{PL("นักเรียนมีความรู้ความเข้าใจ (K)",l.k,{ind:56,min:2});PL("นักเรียนมีความรู้เกิดทักษะ (P)",l.p,{ind:56,min:2});PL("นักเรียนมีเจตคติ ค่านิยม คุณธรรมจริยธรรม (A)",l.a,{ind:56,min:2})}
  L('<span class="bi">ปัญหาและอุปสรรค</span>',32,true);
  L(bx(l.probTime)+"กิจกรรมการจัดการเรียนรู้ ไม่เหมาะสมกับเวลา",56);L(bx(l.probLate)+"มีนักเรียนทำใบงาน/ใบกิจกรรมไม่ทันตามกำหนดเวลา",56);L(bx(l.probInterest)+"มีนักเรียนที่ไม่สนใจเรียน",56);
  PL("อื่น ๆ",l.probOther,{ind:56,bold:false,box:l.probOtherOn});
  L('<span class="bi">ข้อเสนอแนะ/แนวทางแก้ไข</span>',32,true);
  PL("ควรนำแผนไปปรับปรุง เรื่อง",l.sugImprove,{ind:56,bold:false,box:l.sugImproveOn,min:2});
  PL("แนวทางแก้ไขปัญหาและอุปสรรค",l.sugFix,{ind:56,bold:false,box:l.sugFixOn,min:2});
  L(bx(l.sugNone)+"ไม่มีข้อเสนอแนะ",56);
  it.push({html:sign(l.teacher,l.position,l.signDate||l.date,user(l.authorId).sig||""),h:106});
  it.push({group:[{html:'<div class="gap"></div>',h:14},{html:ln('<span class="b">ความคิดเห็นของผู้อำนวยการ/ผู้ที่ได้รับมอบหมาย</span>'),h:24,kn:true},
    ...paraLines("",r.comment,{min:2}).map(x=>({html:x,h:24})),{html:sign(r.comment?r.name:"",r.comment?r.pos:"",r.comment?r.date:"",r.comment?reviewSig(r):""),h:106}]});
  const cont=`<div class="cont">${esc(t1)}${esc(thd(v1))} (วันที่ ${esc(thd(dt))}) <b>(ต่อ)</b></div>`;
  return wrapPages(paginate(it,cont));
}
function sheetHTML(l){return sheetPages(l).join("")}
function coverPages(a,logs){
  const u=user(a.teacherId),kg=a.level==="อนุบาล",[t,y]=a.term.split("/");
  const head=`<thead><tr><th style="width:58px">หน่วยที่</th><th style="width:52px">แผนที่</th><th>เรื่อง</th><th style="width:70px">ชั้น</th><th style="width:132px">วันที่สอน</th></tr></thead>`;
  const rows=logs.map(l=>({html:`<tr><td>${thd(l.unitNo)}</td><td>${thd(l.planNo)}</td><td>${esc(thd(l.topic))}</td><td>${esc(thd(l.cls))}</td><td>${esc(thd(thaiDate(l.date)))}</td></tr>`,h:wrap(thd(l.topic),320,320).length*20+9}));
  const chunks=[[]];let used=0,cap=PAGE_BODY-470;
  rows.forEach(r=>{if(used+r.h>cap&&chunks[chunks.length-1].length){chunks.push([]);used=0;cap=PAGE_BODY-70}chunks[chunks.length-1].push(r);used+=r.h});
  const n=chunks.length,pno=i=>n>1?`<span class="pno">หน้า ${thd(i+1)}/${thd(n)}</span>`:"";
  return chunks.map((c,i)=>i===0
    ?`<div class="sheet cover"><span class="tag">${esc(D.settings.school)}</span><div class="cv"><div class="big">บันทึกผลหลังแผนการจัด${kg?"ประสบการณ์":"การเรียนรู้"}</div><div class="rule"></div>
  <div class="meta">${kg?"ระดับปฐมวัย":`รายวิชา ${esc(thd(a.subject))}${a.code?" รหัสวิชา "+esc(thd(a.code)):""}`}<br>ชั้น ${esc(thd(a.classes.join(", ")))}<br>ภาคเรียนที่ ${thd(t)} ปีการศึกษา ${thd(y)}<br><br>
  ครูผู้สอน ${esc(u.name)}<br>ตำแหน่ง ${esc(u.position)}<br>${esc(D.settings.school)}</div></div>
  <table class="toc">${head}<tbody>${c.map(r=>r.html).join("")}</tbody></table>${pno(i)}</div>`
    :`<div class="sheet"><span class="tag">${esc(D.settings.school)}</span><div class="ln"><span class="b">สารบัญ (ต่อ)</span></div><table class="toc" style="margin-top:8px">${head}<tbody>${c.map(r=>r.html).join("")}</tbody></table>${pno(i)}</div>`);
}
function coverHTML(a,logs){return coverPages(a,logs).join("")}
function fitSheets(){document.querySelectorAll(".sheetfit").forEach(w=>{const s=w.firstElementChild;if(!s)return;const k=Math.min(1,w.clientWidth/794);s.style.transform=k<1?`scale(${k})`:"";w.style.height=Math.ceil(s.offsetHeight*k)+"px";if(k>=1){s.style.margin="0 auto"}})}
window.addEventListener("resize",()=>{clearTimeout(fitSheets.t);fitSheets.t=setTimeout(fitSheets,80)});

// ---------- PDF & files
let closePvw=null;
function makePdf(logs,name,coverAssign){
  if(!logs.length){toast("ไม่มีบันทึกให้สร้าง PDF");return}
  const parts=(coverAssign?coverPages(coverAssign,logs):[]).concat(logs.flatMap(sheetPages)),pv=$("pvw");
  pv.innerHTML=`<div class="pvw-bar gut"><button class="x" id="pvX" aria-label="ปิดตัวอย่าง">${ic("x")}</button><div class="t"><b>${esc(name)}.pdf</b><small>ตัวอย่างก่อนดาวน์โหลด · ${parts.length} หน้า · กระดาษ A4</small></div>
    <button class="btn gold" id="pvDl">${ic("pdf")}<span>ดาวน์โหลด PDF</span></button></div>
    <div class="pvw-body gut">${parts.map((h,i)=>`<div class="pg"><div class="sheetfit">${h}</div><small>หน้า ${i+1} / ${parts.length}</small></div>`).join("")}</div>`;
  pv.hidden=false;document.body.style.overflow="hidden";
  const close=()=>{pv.hidden=true;pv.innerHTML="";document.body.style.overflow=""};
  $("pvX").onclick=close;$("pvDl").onclick=()=>buildPdf(parts,name);closePvw=close;
  requestAnimationFrame(fitSheets);
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if($("modal")){closeModal();return}if(!$("pvw").hidden&&closePvw)closePvw();$("more").hidden=true}});
async function buildPdf(parts,name){
  if(!DL){toast("หน้านี้ดาวน์โหลดไฟล์ไม่ได้ในมุมมองนี้");return}
  if(!window.html2pdf){toast("โหลดตัวสร้าง PDF ไม่สำเร็จ ลองโหลดหน้าใหม่");return}
  const work=$("pdfWork");work.hidden=false;
  try{
    try{await document.fonts.load("400 14.5px Sarabun");await document.fonts.load("700 14.5px Sarabun")}catch(e){}
    const st=$("pdfStage");
    st.innerHTML=`<div id="pdfRoot">${parts.join('<div class="html2pdf__page-break"></div>')}</div>`;
    st.querySelectorAll(".sheet").forEach(s=>{s.style.boxShadow="none";s.style.borderTop="0"});
    const blob=await html2pdf().set({margin:0,image:{type:"jpeg",quality:0.96},html2canvas:{scale:2,backgroundColor:"#ffffff",useCORS:true,logging:false},
      jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["legacy"]}}).from($("pdfRoot")).outputPdf("blob");
    st.innerHTML="";
    await DL.save({filename:name.replace(/[\\/:*?"<>|\s]+/g,"-")+".pdf",data:blob});
    toast("บันทึกไฟล์ PDF แล้ว");
  }catch(e){if(!e||e.code!=="declined")toast("สร้าง PDF ไม่สำเร็จ"+(e&&e.code?" ("+e.code+")":""));console.warn(e)}
  finally{work.hidden=true}
}
async function saveText(name,rows){
  if(!DL)return;const q=s=>'"'+String(s??"").replace(/"/g,'""')+'"';
  try{await DL.save({filename:name,data:"﻿"+rows.map(r=>r.map(q).join(",")).join("\r\n")});toast("บันทึกไฟล์แล้ว")}catch(e){if(!e||e.code!=="declined")toast("ดาวน์โหลดไม่สำเร็จ")}
}
function csvLogs(rows){
  saveText("บันทึกหลังสอน_"+S.term.replace("/","-")+".csv",[["วันที่สอน","ภาคเรียน","ครูผู้สอน","ระดับ","กลุ่มสาระ","รหัสวิชา","วิชา","ชั้น","คาบ","หน่วยที่","ชื่อหน่วย","แผนที่","เรื่อง","นักเรียนทั้งหมด","ผ่าน","ร้อยละผ่าน","K","P","A","ปัญหาอื่น","ควรปรับปรุง","แนวทางแก้ไข","ความคิดเห็นผู้บริหาร"],
    ...rows.map(l=>[l.date,l.term,l.teacher,l.level,l.group,l.code,l.subject,l.cls,l.period,l.unitNo,l.unitName,l.planNo,l.topic,l.total,l.pass,fmtPct(pct(l)),l.k||l.dBody,l.p||l.dEmo,l.a||l.dSoc,l.probOther,l.sugImprove,l.sugFix,(D.reviews[l.id]||{}).comment||""])]);
}

// ---------- gate screens (first page)
function renderGate(){
  const g=$("gate");
  g.innerHTML=`<div class="inner gut"><form class="login" id="lf" novalidate>
    <span class="mark has-img" id="gLogo" role="img" aria-label="สมุดบันทึกหลังสอน">${logoHTML()}</span>
    <div><h1 id="gTitle">สมุดบันทึกหลังสอน</h1><div class="school">${esc(D.settings.school)}</div><span class="termchip">ภาคเรียนปัจจุบัน ${esc(curTerm())}</span></div>
    <label class="f">ชื่อผู้ใช้<input id="lu" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="ชื่อผู้ใช้ที่ได้รับจากโรงเรียน"></label>
    <label class="f">รหัสผ่าน<span class="pwrap"><input id="lp" type="password" autocomplete="current-password" placeholder="รหัสผ่าน"><button type="button" class="eye" id="leye" aria-label="แสดงรหัสผ่าน">${ic("eye")}</button></span></label>
    <p class="err" id="lerr" role="alert" style="margin:0">${esc(S.loginErr)}</p>
    <button class="gbtn" type="submit" id="lbtn">${ic("login")}เข้าสู่ระบบ</button>
    <small class="muted">ลืมรหัสผ่าน ติดต่อแอดมินโรงเรียน</small>
    <button type="button" class="gbtn2" id="gGoogle" hidden><span class="gg">G</span>เข้าสู่ระบบด้วยบัญชี Google</button>
  </form></div>
  <footer class="gut">${esc(D.settings.credit)}</footer>`;
  {let n=0,t=0;const tap=()=>{const now=Date.now();n=now-t<1500?n+1:1;t=now;if(n>=5){$("gGoogle").hidden=false;n=0}};$("gLogo").addEventListener("click",tap)}
  $("gGoogle").onclick=async()=>{S.loginErr="";const p=new GoogleAuthProvider();p.setCustomParameters({prompt:"select_account"});
    try{await signInWithPopup(auth,p)}catch(e){if(/popup-blocked|operation-not-supported/.test(e.code||"")){try{await signInWithRedirect(auth,p)}catch(x){$("lerr").textContent=authMsg(x)}}else if(!/popup-closed|cancelled-popup/.test(e.code||""))$("lerr").textContent=authMsg(e)}};
  $("leye").onclick=()=>{const p=$("lp");p.type=p.type==="password"?"text":"password"};
  $("lf").addEventListener("submit",async e=>{e.preventDefault();S.loginErr="";const un=$("lu").value.trim().toLowerCase(),pw=$("lp").value;
    if(!un||!pw){$("lerr").textContent="กรอกชื่อผู้ใช้และรหัสผ่าน";return}
    if(!/^[a-z0-9._-]{3,30}$/.test(un)){$("lerr").textContent="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";return}
    $("lbtn").disabled=true;$("lerr").textContent="";
    try{await signInWithEmailAndPassword(auth,un+"@"+userDomain,pw)}
    catch(x){$("lerr").textContent=authMsg(x);$("lp").value="";$("lp").focus()}
    finally{const b=$("lbtn");if(b)b.disabled=false}});
}

// ---------- view: home
function vHome(m){
  const u=me(),cur=curTerm(),cyc=cycleOf(TODAY),wf=cyc.from,wt=cyc.to,inWeek=l=>l.date>=wf&&l.date<=wt;
  const asg=myAssigns(S.me,cur),mine=D.logs.filter(l=>l.authorId===S.me&&l.term===cur);
  const hour=new Date().getHours(),greet=hour<12?"สวัสดีตอนเช้า":hour<17?"สวัสดีตอนบ่าย":"สวัสดีตอนเย็น";
  let h=`${S.term!==cur?`<div class="banner">${ic("info")}<div>หน้าหลักแสดงภาคเรียนปัจจุบัน (${esc(cur)}) · ข้อมูลภาคเรียน ${esc(S.term)} ดูได้ที่เมนูบันทึกและรวมเล่ม</div></div>`:""}
  <div class="card hello"><div style="min-width:0"><small>${greet}</small><h2>${esc(u.name)}</h2><div class="muted">${ROLE[u.role]} · ${esc(u.position)} · ${esc(cyc.label)} · ส่งภายใน${esc(dueTxt(cyc))}</div></div>
   <div class="row2">${asg.length?`<button class="btn gold" data-go="write">${ic("plus")}เขียนบันทึก</button>`:""}${isAdmin()?`<button class="btn" data-go="track">${ic("track")}ติดตามการส่ง</button>`:`<button class="btn" data-go="binder">${ic("book")}รวมเล่ม</button>`}</div></div>`;
  if(isAdmin()){
    const all=D.logs.filter(l=>l.term===cur),tchs=D.users.filter(x=>x.active&&D.assigns.some(a=>a.teacherId===x.id&&a.term===cur));
    const cnt=x=>all.filter(l=>l.authorId===x.id&&inWeek(l)).length,sent=tchs.filter(x=>dueStatus(cnt(x),cyc).k==="good"),notSent=tchs.filter(x=>!sent.includes(x));
    const waiting=all.filter(l=>!reviewed(l.id)).sort((a,b)=>a.date.localeCompare(b.date));
    h+=`<div class="tiles"><div><b>${all.filter(inWeek).length}</b><span>บันทึกรอบนี้</span></div><div><b style="color:var(--good)">${sent.length}/${tchs.length}</b><span>ครูที่ส่งครบรอบนี้</span></div><div><b>${waiting.length}</b><span>รอลงนาม</span></div><div><b>${all.length}</b><span>บันทึกทั้งภาคเรียน</span></div></div>
    <div class="two-col">
      <div class="card gold"><div class="sec-h"><h2>รอลงนาม</h2><span class="sp"></span>${waiting.length?`<button class="btn sm ghost" data-go="sign">ลงนามหลายรายการ</button>`:""}</div>
        ${waiting.length?waiting.slice(0,5).map(l=>`<div class="todo"><div><b>${esc(l.teacher)}</b><small>${esc((l.code?l.code+" ":"")+l.subject)} · ${esc(l.cls)} · ${shortDate(l.date)}</small></div><button class="btn sm" data-open="${l.id}">ลงนาม</button></div>`).join(""):`<p class="muted">ลงนามครบทุกบันทึกแล้ว</p>`}</div>
      <div class="card gold"><div class="sec-h"><h2>ยังไม่ส่งครบรอบนี้</h2><span class="sp"></span><button class="btn sm ghost" data-go="track">ติดตามการส่ง</button></div>
        ${notSent.length?notSent.map(x=>{const last=D.logs.filter(l=>l.authorId===x.id).map(l=>l.date).sort().pop();return `<div class="todo"><div><b>${esc(x.name)}</b><small>${esc(myAssigns(x.id,cur).map(a=>a.subject).join(", "))} · ส่งล่าสุด ${last?shortDate(last):"—"}</small></div>${(z=>`<span class="chip ${z.k}">${z.t}</span>`)(dueStatus(cnt(x),cyc))}</div>`}).join(""):`<p class="muted">ครูทุกคนส่งครบรอบนี้แล้ว</p>`}</div>
      ${isSuper()?`<div class="card gold"><div class="sec-h"><h2>แอดมินโรงเรียน</h2><span class="sp"></span><button class="btn sm ghost" data-go="people">จัดการ</button></div>
        ${D.users.filter(x=>x.role==="admin").map(x=>`<div class="todo"><div><b>${esc(x.name)}</b><small>${esc(x.position)} · ชื่อผู้ใช้ ${esc(x.username)}</small></div><span class="chip red">แอดมิน</span></div>`).join("")}</div>`:""}
    </div>`;
  }
  if(asg.length||!isAdmin()){
    const pairs=asg.flatMap(a=>a.classes.map(c=>({a,c,n:mine.filter(l=>l.assignId===a.id&&l.cls===c&&inWeek(l)).length})));
    h+=`${isAdmin()?"":`<div class="tiles"><div><b>${mine.filter(inWeek).length}</b><span>บันทึกรอบนี้</span></div><div><b>${mine.length}</b><span>ทั้งภาคเรียน</span></div><div><b>${mine.filter(l=>!reviewed(l.id)).length}</b><span>รอลงนาม</span></div><div><b>${asg.length}</b><span>วิชาที่สอน</span></div></div>`}
    <div class="two-col">
      <div class="card gold"><div class="sec-h"><h2>${isAdmin()?"วิชาที่ฉันสอน · ":""}รอบนี้</h2></div><div class="duebar">${ic("info")}<span>${esc(cyc.label)} · ส่งภายใน<b>${esc(dueTxt(cyc))}</b></span></div>
        ${pairs.length?pairs.map(p=>`<div class="todo"><div><b>${esc((p.a.code?p.a.code+" ":"")+p.a.subject)}</b><small>${esc(p.c)}</small></div>${p.n?`<span class="chip good">${ic("check").replace('aria-hidden="true"','aria-hidden="true" style="width:14px;height:14px"')}บันทึกแล้ว ${p.n}</span>`:`<button class="btn sm" data-wa="${p.a.id}" data-wc="${esc(p.c)}">${ic("plus")}เขียน</button>`}</div>`).join("")
          :`<p class="muted">ยังไม่ได้กำหนดวิชาที่สอนในภาคเรียนนี้</p><button class="btn primary" data-go="subjects">${ic("layers")}กำหนดวิชาที่สอน</button>`}</div>
      <div class="card gold"><div class="sec-h"><h2>ความคืบหน้ารายวิชา</h2><span class="sp"></span><button class="btn sm ghost" data-go="binder">รวมเล่ม</button></div>
        ${asg.length?asg.map(a=>{const ls=mine.filter(l=>l.assignId===a.id),last=ls.slice().sort((x,y)=>(+y.planNo)-(+x.planNo))[0],plans=new Set(ls.map(l=>l.planNo)).size,units=new Set(ls.map(l=>l.unitNo)).size,tot=ls.length,sig=ls.filter(l=>reviewed(l.id)).length;
          return `<div class="todo"><div><b>${esc((a.code?a.code+" ":"")+a.subject)}</b><small>${units} หน่วย · ${plans} แผน · ${tot} บันทึก${last?` · ล่าสุด แผนที่ ${esc(last.planNo)} ${esc(last.topic)}`:""}</small>
          <div class="prog" title="ลงนามแล้ว ${sig} จาก ${tot}"><i style="width:${tot?Math.round(sig/tot*100):0}%"></i></div><small>ผู้บริหารลงนามแล้ว ${sig}/${tot}</small></div></div>`}).join(""):`<p class="muted">—</p>`}</div>
    </div>
    <div class="sec-h"><h2>บันทึกล่าสุดของฉัน</h2><span class="sp"></span><button class="btn sm ghost" data-go="logs">ดูทั้งหมด</button></div>
    <div class="list">${mine.length?mine.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3).map(l=>itemHTML(l,false)).join(""):`<div class="empty"><h3>ยังไม่มีบันทึกในภาคเรียนนี้</h3></div>`}</div>`;
  }
  m.innerHTML=h;
  m.querySelectorAll("[data-wa]").forEach(b=>b.onclick=()=>{S.editId=null;S.w={assign:b.dataset.wa,cls:b.dataset.wc};go.keep=true;go("write")});
  $("hWait")&&($("hWait").onclick=()=>{S.f={teacher:"",assign:"",unit:"",cls:"",status:"wait",q:""};go("logs")});
}

// ---------- Firebase: subscriptions & live updates
const subs={};
function sub(key,q,cb){if(subs[key])subs[key]();subs[key]=onSnapshot(q,cb,e=>{console.warn(key,e);if(e.code==="permission-denied"&&key!=="settings")toast("ไม่มีสิทธิ์อ่านข้อมูลบางส่วน")})}
function unsub(key){if(subs[key]){subs[key]();delete subs[key]}}
function stopData(){Object.keys(subs).forEach(k=>{if(k!=="settings"&&k!=="me")unsub(k)})}
function live(){
  if(S.screen!=="app")return;
  const ae=document.activeElement,typing=ae&&$("main").contains(ae)&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
  if(typing||["write","account","settings"].includes(S.view)||!$("pvw").hidden){renderNav();renderTermSel();return}
  render();
}
function setTerm(t){if(!t||t===S.term)return;S.term=t;if(S.screen==="app")subTerm()}
function subTerm(){
  D.logs=[];D.reviews={};
  const lq=isAdmin()?query(collection(db,"logs"),where("term","==",S.term)):query(collection(db,"logs"),where("authorId","==",S.me),where("term","==",S.term));
  sub("logs",lq,s=>{D.logs=s.docs.map(d=>({id:d.id,...d.data()}));live()});
  sub("reviews",query(collection(db,"reviews"),where("term","==",S.term)),s=>{const m={};s.docs.forEach(d=>m[d.id]=d.data());D.reviews=m;live()});
}
function startData(){
  sub("users",isSuper()?collection(db,"users"):query(collection(db,"users"),where("role","in",["admin","teacher"])),s=>{D.users=s.docs.map(d=>({id:d.id,...d.data()}));live()});
  sub("assigns",isAdmin()?collection(db,"assigns"):query(collection(db,"assigns"),where("teacherId","==",S.me)),s=>{D.assigns=s.docs.map(d=>({id:d.id,...d.data()}));live()});
  sub("courses",collection(db,"courses"),s=>{D.courses=s.docs.map(d=>({id:d.id,...d.data()}));live()});
  subTerm();
}
function saveSettings(p,msg){setDoc(doc(db,"settings","public"),p,{merge:true}).then(()=>{toast(msg);if(S.view==="settings")render()}).catch(e=>toast(fsMsg(e)))}

// ---------- boot
if(!CONFIGURED){
  $("boot").innerHTML='<div class="login" style="text-align:left"><h1 style="font-size:1.3rem">ยังไม่ได้ตั้งค่า Firebase</h1><p class="muted" style="margin:0">เปิดไฟล์ <code>js/firebase-config.js</code> แล้ววางค่า firebaseConfig จาก Firebase Console ตามคู่มือใน README.md</p></div>';
}else{
  sub("settings",doc(db,"settings","public"),s=>{
    const before=curTerm();if(s.exists())Object.assign(D.settings,s.data());const now=curTerm();
    if(S.screen==="login"){const g=$("gate"),sc=g.querySelector(".school"),tc=g.querySelector(".termchip"),ft=g.querySelector("footer");
      if(sc)sc.textContent=D.settings.school;if(tc)tc.textContent="ภาคเรียนปัจจุบัน "+now;if(ft)ft.textContent=D.settings.credit}
    else if(S.screen==="app"){if(S.term===before)setTerm(now);live()}
  });
  getRedirectResult(auth).catch(e=>{S.loginErr=authMsg(e);if(S.screen==="login")render()});
  onAuthStateChanged(auth,async u=>{
    stopData();unsub("me");S.meDoc=null;S.me=null;D.users=[];D.assigns=[];D.logs=[];D.reviews={};
    $("pvw").hidden=true;$("more").hidden=true;document.body.style.overflow="";
    if(!u){S.screen="login";render();return}
    S.me=u.uid;
    const ref=doc(db,"users",u.uid);
    try{
      let snap=await getDoc(ref);
      if(!snap.exists()&&u.providerData.some(p=>p.providerId==="google.com")){await api("bootstrap");snap=await getDoc(ref)}
      if(!snap.exists())throw new Error("บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบ");
    }catch(e){S.loginErr=e.message||"เข้าสู่ระบบไม่สำเร็จ";await signOut(auth);return}
    sub("me",ref,s=>{
      const d=s.data();
      if(!d||!d.active||!["teacher","admin","superadmin"].includes(d.role)){S.loginErr=d&&!d.active?"บัญชีนี้ถูกปิดการใช้งาน ติดต่อแอดมินโรงเรียน":"บัญชีนี้ไม่มีสิทธิ์เข้าใช้ระบบ";signOut(auth);return}
      const prev=S.meDoc;S.meDoc={id:u.uid,email:u.email,...d};S.loginErr="";
      if(!prev||prev.role!==d.role){S.screen="app";resetUI();stopData();S.term=curTerm();startData();render();window.scrollTo(0,0)}
      else live();
    });
  });
}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{if(S.screen==="app"&&S.view==="doc")render();else fitSheets()});
