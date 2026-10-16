(() => {
  "use strict";
  // Set this to the deployed Worker origin before publishing the backend.
  const API_BASE = window.ERU_API_BASE || "";
  const root = document.getElementById("out");
  if (!root) return;
  const css = document.createElement("style");
  css.textContent = `
    .eru-extra{margin:28px 0 0;text-align:start}.eru-extra h2{margin:0 0 14px}
    .eru-extra-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}
    .eru-extra-card{background:var(--card,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.12));border-radius:16px;padding:16px;min-width:0}
    .eru-extra-card h3{margin:0 0 8px;font-size:1rem}.eru-extra-muted{opacity:.75;font-size:.9rem}
    .eru-extra-controls{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
    .eru-extra-controls input,.eru-extra-controls select{max-width:260px;min-width:180px}
    .eru-extra-link{display:inline-block;margin-top:8px;overflow-wrap:anywhere}
    .eru-extra-list{display:grid;gap:8px}.eru-extra-line{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--border,rgba(255,255,255,.12));padding:8px 0}
    .eru-extra-line:last-child{border-bottom:0}.eru-extra-notice{padding:12px 14px;border-radius:12px;background:rgba(127,153,220,.1);border:1px solid var(--border,rgba(255,255,255,.12))}
  `;
  document.head.append(css);
  const translations = {
    ar: {schedule:"الجدول الأكاديمي",rooms:"دليل القاعات",groups:"جروبات السكاشن",pending:"سيتم عرض البيانات المؤكدة المنشورة هنا بعد ربط قاعدة البيانات.",notConnected:"الواجهة جاهزة، لكن مصدر البيانات لم يتم ربطه بعد.",loadError:"تعذر تحميل البيانات حاليًا.",empty:"لا توجد بيانات منشورة حتى الآن.",section:"السكشن",course:"المادة",day:"اليوم",time:"الوقت",type:"النوع",room:"القاعة",instructor:"الدكتور",search:"ابحث عن مادة أو دكتور",allSections:"كل السكاشن",building:"المبنى",floor:"الدور",openGroup:"فتح الجروب",lecture:"محاضرة",tutorial:"سكشن",lab:"معمل",days:["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"]},
    en: {schedule:"Academic Schedule",rooms:"Campus & Room Guide",groups:"Section Groups",pending:"Only confirmed, published data will appear here after the database is connected.",notConnected:"The interface is ready, but the data source has not been connected yet.",loadError:"Unable to load data right now.",empty:"No published records yet.",section:"Section",course:"Course",day:"Day",time:"Time",type:"Type",room:"Room",instructor:"Instructor",search:"Search course or instructor",allSections:"All sections",building:"Building",floor:"Floor",openGroup:"Open group",lecture:"Lecture",tutorial:"Tutorial",lab:"Lab",days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]}
  };
  let data = {courses:[],sessions:[],rooms:[],groups:[]};
  const lang = () => document.documentElement.lang === "en" ? "en" : "ar";
  const t = () => translations[lang()];
  const el = (tag, cls, value) => { const node=document.createElement(tag); if(cls)node.className=cls; if(value!==undefined)node.textContent=value; return node; };
  const section = (id,title) => {const s=el("section","eru-extra");s.id=id;s.append(el("h2","",title));return s;};
  const notice = (message) => {const n=el("div","eru-extra-notice",message);return n;};
  const fetchData = async path => {const response=await fetch(API_BASE+path,{headers:{Accept:"application/json"},cache:"no-store"});if(!response.ok)throw new Error("API unavailable");const result=await response.json();return result.data||[];};
  function renderSchedule(parent) {
    const tr=t(), s=section("eru-academic-schedule",tr.schedule);
    if(!API_BASE){s.append(notice(tr.notConnected));parent.append(s);return;}
    const controls=el("div","eru-extra-controls"), search=el("input");search.type="search";search.placeholder=tr.search;search.setAttribute("aria-label",tr.search);
    const select=el("select");select.setAttribute("aria-label",tr.section);const all=el("option","",tr.allSections);all.value="";select.append(all);
    [...new Set(data.sessions.map(x=>x.section_code).filter(Boolean))].sort().forEach(v=>{const o=el("option","",v);o.value=v;select.append(o)});
    controls.append(search,select);s.append(controls);const list=el("div","eru-extra-grid");s.append(list);
    const paint=()=>{list.replaceChildren();const query=search.value.trim().toLocaleLowerCase();const rows=data.sessions.filter(x=>(!select.value||x.section_code===select.value)&&(!query||[x.course_code,x.course_name_ar,x.course_name_en,x.instructor,x.room_code].some(v=>String(v||"").toLocaleLowerCase().includes(query))));if(!rows.length){list.append(notice(tr.empty));return;}
      rows.forEach(x=>{const card=el("article","eru-extra-card");card.append(el("h3","",x.course_name_ar||x.course_name_en||x.course_code||tr.course));const lines=el("div","eru-extra-list");[[tr.section,x.section_code],[tr.day,tr.days[x.day_of_week]||"—"],[tr.time,String(x.start_time||"")+" – "+String(x.end_time||"")],[tr.type,tr[x.session_type]||x.session_type],[tr.room,[x.building,x.room_code].filter(Boolean).join(" · ")||"—"],[tr.instructor,x.instructor||"—"]].forEach(([k,v])=>{const line=el("div","eru-extra-line");line.append(el("span","eru-extra-muted",k),el("strong","",v||"—"));lines.append(line)});card.append(lines);list.append(card);});};
    search.addEventListener("input",paint);select.addEventListener("change",paint);paint();parent.append(s);
  }
  function renderRooms(parent) {
    const tr=t(), s=section("eru-campus-guide",tr.rooms);
    if(!API_BASE){s.append(notice(tr.notConnected));parent.append(s);return;}
    const grid=el("div","eru-extra-grid");if(!data.rooms.length)grid.append(notice(tr.empty));
    data.rooms.forEach(r=>{const card=el("article","eru-extra-card");card.append(el("h3","",r.name_ar||r.name_en||r.room_code));[[tr.building,r.building],[tr.floor,r.floor],[tr.room,r.room_code]].forEach(([k,v])=>{if(v){const line=el("div","eru-extra-line");line.append(el("span","eru-extra-muted",k),el("strong","",v));card.append(line)}});const desc=lang()==="en"?r.description_en:r.description_ar;if(desc)card.append(el("p","",desc));grid.append(card)});s.append(grid);parent.append(s);
  }
  function renderGroups(parent) {
    const tr=t(), s=section("eru-section-groups",tr.groups);
    if(!API_BASE){s.append(notice(tr.notConnected));parent.append(s);return;}
    const grid=el("div","eru-extra-grid");if(!data.groups.length)grid.append(notice(tr.empty));
    data.groups.forEach(g=>{const card=el("article","eru-extra-card");card.append(el("h3","",g.course_code||tr.groups));card.append(el("p","",tr.section+": "+(g.section_code||"—")));try{const url=new URL(g.group_url);if(url.protocol==="https:"||url.protocol==="http:"){const a=el("a","eru-extra-link",tr.openGroup);a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";card.append(a)}}catch{}grid.append(card)});s.append(grid);parent.append(s);
  }
  async function load() {
    if(!API_BASE){renderFeatures();return;}
    try {const [courses,sessions,rooms,groups]=await Promise.all([fetchData("/api/courses"),fetchData("/api/sessions"),fetchData("/api/rooms"),fetchData("/api/section-groups")]);data={courses,sessions,rooms,groups};renderFeatures();}
    catch {data={courses:[],sessions:[],rooms:[],groups:[]};renderFeatures(t().loadError);}
  }
  function renderFeatures(errorMessage) {
    const old=document.getElementById("eru-extra-root");if(old)old.remove();
    const parent=el("div","");parent.id="eru-extra-root";
    if(errorMessage)parent.append(notice(errorMessage));
    renderSchedule(parent);renderRooms(parent);renderGroups(parent);root.append(parent);
  }
  if(typeof window.render==="function"){
    const original=window.render;
    window.render=function(){original();renderFeatures();};
  }
  load();
})();
