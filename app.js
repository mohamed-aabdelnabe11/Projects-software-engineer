// app.js المحدث بدون أي تعارض في الأسماء
var { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG || {};

var supabaseClient = null;
var currentUser = null;
var currentProfile = null;
var allCourses = [];
var myRegs = [];

function $(id){ return document.getElementById(id); }

function showSection(id){
  ['view-login','view-setup','view-student','view-doctor','view-admin'].forEach(v=>{
    if($(v)) $(v).classList.toggle('hidden', v !== id);
  });
}

function showMsg(el, text, type='info'){
  if(!el) return;
  el.innerHTML = `<div class="msg ${type}">${text}</div>`;
}

function clearMsg(el){ if(el) el.innerHTML=''; }

function topbar(show){
  if($('topbar')) $('topbar').classList.toggle('hidden', !show);
}

async function init(){
  var cfg = window.APP_CONFIG || {};
  var url = cfg.SUPABASE_URL;
  var key = cfg.SUPABASE_ANON_KEY;

  if(!url || url.includes('YOUR-PROJECT') || !key || key.includes('YOUR-ANON')){
    showSection('view-setup');
    const lb = $('loginBtn');
    if(lb) lb.addEventListener('click', ()=>showMsg($('loginMsg'),'أكمل إعداد config.js أولاً','error'));
    return;
  }

  if(!window.supabase){
    showSection('view-login');
    showMsg($('loginMsg'),'لم يتم تحميل مكتبة Supabase. تحقق من الاتصال بالإنترنت.','error');
    return;
  }

  try {
    supabaseClient = window.supabase.createClient(url, key);
  } catch(err){
    showSection('view-login');
    showMsg($('loginMsg'),'خطأ في إعداد Supabase: '+ (err.message||err),'error');
    return;
  }

  if($('loginBtn')) $('loginBtn').addEventListener('click', doLogin);
  if($('logoutBtn')) $('logoutBtn').addEventListener('click', doLogout);

  try {
    const { data } = await supabaseClient.auth.getSession();
    if(data && data.session){
      await handleSession(data.session);
    } else {
      showSection('view-login');
    }
    supabaseClient.auth.onAuthStateChange(async (_e, session)=>{
      if(session) await handleSession(session); 
      else { 
        currentUser = null; 
        currentProfile = null; 
        topbar(false); 
        showSection('view-login'); 
      }
    });
  } catch(err){
    showSection('view-login');
    showMsg($('loginMsg'),'تعذر الاتصال بـ Supabase: '+ (err.message||err),'error');
  }
}

async function handleSession(session){
  currentUser = session.user;
  const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
  
  if(error || !profile){
    showMsg($('loginMsg'), 'لم يتم العثور على الملف الشخصي. تواصل مع الإدارة.', 'error');
    await supabaseClient.auth.signOut();
    showSection('view-login');
    return;
  }

  if(profile.status !== 'active'){
    showMsg($('loginMsg'), 'الحساب غير مفعل. يرجى مراجعة الإدارة.', 'error');
    await supabaseClient.auth.signOut();
    showSection('view-login');
    return;
  }

  currentProfile = profile;
  if($('userLabel')) $('userLabel').textContent = profile.full_name;
  topbar(true);

  if(profile.role === 'student'){
    if($('studentName')) $('studentName').textContent = profile.full_name;
    showSection('view-student');
    await loadStudent();
    setupStudentEvents();
  } else if(profile.role === 'doctor'){
    if($('doctorName')) $('doctorName').textContent = profile.full_name;
    showSection('view-doctor');
    await loadDoctor();
  } else if(profile.role === 'admin'){
    if($('adminName')) $('adminName').textContent = profile.full_name;
    showSection('view-admin');
    await loadAdmin();
    setupAdminEvents();
  }
}

async function doLogin(){
  clearMsg($('loginMsg'));
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;

  if(!email || !password){
    showMsg($('loginMsg'), 'أدخل البريد وكلمة المرور', 'error'); 
    return;
  }

  if(!supabaseClient){
    showMsg($('loginMsg'), 'Supabase غير مهيأ. راجع config.js.', 'error'); 
    return;
  }

  const btn = $('loginBtn');
  btn.disabled = true;
  showMsg($('loginMsg'), 'جاري تسجيل الدخول...', 'info');

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if(error){
      showMsg($('loginMsg'), 'بيانات الاعتماد غير صحيحة: ' + error.message, 'error');
      return;
    }
    if(data && data.user){
      await handleSession(data.session);
    }
  } catch(err){
    showMsg($('loginMsg'), 'حدث خطأ: ' + (err.message||err), 'error');
  } finally {
    btn.disabled = false;
  }
}

async function doLogout(){
  if(supabaseClient) await supabaseClient.auth.signOut();
}

// ---------- Student ----------
let studentEventsBound = false;
function setupStudentEvents(){
  if(studentEventsBound) return;
  studentEventsBound = true;
  if($('courseSearch')) $('courseSearch').addEventListener('input', renderCourses);
}

async function loadStudent(){
  await loadCourses();
  await loadMyRegistrations();
  renderCourses();
  renderMyCourses();
  renderSchedule();
}

async function loadCourses(){
  const { data, error } = await supabaseClient.from('courses').select('*, doctor:profiles(full_name)').order('course_code');
  if(error){ console.error(error); return; }
  allCourses = data || [];
}

async function loadMyRegistrations(){
  const { data, error } = await supabaseClient.from('registrations')
    .select('*, course:courses(*, doctor:profiles(full_name))')
    .eq('student_id', currentProfile.id);
  if(error){ console.error(error); return; }
  myRegs = data || [];
  if($('studentRegCount')) $('studentRegCount').textContent = myRegs.length;
}

function isRegistered(courseId){ return myRegs.some(r=>r.course_id===courseId); }

function renderCourses(){
  const q = ($('courseSearch')?.value || '').toLowerCase();
  const tbody = $('coursesTable')?.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';

  allCourses.filter(c=>{
    if(!q) return true;
    return (c.course_code||'').toLowerCase().includes(q) || (c.course_name||'').toLowerCase().includes(q);
  }).forEach(c=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.course_code}</td>
      <td>${c.course_name}</td>
      <td>${c.doctor?.full_name||'-'}</td>
      <td>${c.credit_hours}</td>
      <td>${c.enrolled_count}/${c.capacity}</td>
      <td>${c.schedule||'-'}</td>
      <td></td>
    `;
    const cell = tr.lastElementChild;
    const full = c.enrolled_count >= c.capacity;
    if(isRegistered(c.id)){
      const b = document.createElement('button'); b.className='btn outline'; b.textContent='مسجل'; b.disabled=true; cell.appendChild(b);
    } else {
      const b = document.createElement('button'); b.className='btn secondary'; b.textContent = full ? 'مكتمل' : 'تسجيل';
      b.disabled = full;
      b.addEventListener('click', async ()=>{ await registerCourse(c.id); });
      cell.appendChild(b);
    }
    tbody.appendChild(tr);
  });
}

async function registerCourse(courseId){
  try {
    const { data, error } = await supabaseClient.rpc('register_for_course', { p_course_id: courseId });
    if(error) throw error;
    await loadStudent();
  } catch(e){
    alert(e.message || 'تعذر التسجيل');
  }
}

function renderMyCourses(){
  const tbody = $('myCoursesTable')?.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  myRegs.forEach(r=>{
    const c = r.course;
    if(!c) return;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.course_code}</td>
      <td>${c.course_name}</td>
      <td>${c.doctor?.full_name||'-'}</td>
      <td>${c.schedule||'-'}</td>
      <td></td>
    `;
    const b = document.createElement('button'); b.className='btn danger'; b.textContent='حذف';
    b.addEventListener('click', async ()=>{ await dropCourse(r.course_id); });
    tr.lastElementChild.appendChild(b);
    tbody.appendChild(tr);
  });
}

async function dropCourse(courseId){
  if(!confirm('حذف المقرر؟')) return;
  try {
    const { error } = await supabaseClient.rpc('drop_course', { p_course_id: courseId });
    if(error) throw error;
    await loadStudent();
  } catch(e){
    alert(e.message || 'تعذر الحذف');
  }
}

function renderSchedule(){
  const ul = $('scheduleList');
  if(!ul) return;
  ul.innerHTML = '';
  myRegs.forEach(r=>{
    if(!r.course) return;
    const li = document.createElement('li');
    li.textContent = `${r.course.course_code} - ${r.course.course_name}: ${r.course.schedule||'-'}`;
    ul.appendChild(li);
  });
  if(!myRegs.length){ ul.innerHTML = '<li class="muted">لا توجد مقررات مسجلة</li>'; }
}

// ---------- Doctor ----------
async function loadDoctor(){
  const { data, error } = await supabaseClient.from('courses')
    .select('*, doctor:profiles(full_name)')
    .eq('doctor_id', currentProfile.id)
    .order('course_code');
  if(error){ console.error(error); return; }
  const tbody = $('doctorCoursesTable')?.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  (data||[]).forEach(c=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.course_code}</td>
      <td>${c.course_name}</td>
      <td>${c.enrolled_count}</td>
      <td>${c.capacity}</td>
      <td>${c.schedule||'-'}</td>
      <td></td>
    `;
    const b = document.createElement('button'); b.className='btn'; b.textContent='عرض الطلاب';
    b.addEventListener('click', async ()=>{ await loadDoctorStudents(c); });
    tr.lastElementChild.appendChild(b);
    tbody.appendChild(tr);
  });
}

async function loadDoctorStudents(course){
  if($('selectedCourseName')) $('selectedCourseName').textContent = course.course_name;
  if($('doctorStudentsCard')) $('doctorStudentsCard').classList.remove('hidden');
  const { data, error } = await supabaseClient.from('registrations')
    .select('registration_date, student:profiles(full_name,email)')
    .eq('course_id', course.id);
  if(error){ console.error(error); return; }
  const tbody = $('doctorStudentsTable')?.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  (data||[]).forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.student?.full_name||'-'}</td>
      <td>${r.student?.email||'-'}</td>
      <td>${new Date(r.registration_date).toLocaleString('ar')}</td>
    `;
    tbody.appendChild(tr);
  });
  if(!(data||[]).length){
    tbody.innerHTML = '<tr><td colspan="3" class="muted">لا يوجد طلاب</td></tr>';
  }
}

// ---------- Admin ----------
let adminEventsBound = false;
function setupAdminEvents(){
  if(adminEventsBound) return;
  adminEventsBound = true;
  if($('saveCourseBtn')) $('saveCourseBtn').addEventListener('click', saveCourse);
  if($('clearCourseBtn')) $('clearCourseBtn').addEventListener('click', clearCourseForm);
}

async function loadAdmin(){
  await loadStats();
  await loadAdminCourses();
  await loadAdminUsers();
  await loadAdminRegistrations();
  await loadDoctorsSelect();
}

async function loadStats(){
  const [s,d,c,r] = await Promise.all([
    supabaseClient.from('profiles').select('id',{count:'exact',head:true}).eq('role','student'),
    supabaseClient.from('profiles').select('id',{count:'exact',head:true}).eq('role','doctor'),
    supabaseClient.from('courses').select('id',{count:'exact',head:true}),
    supabaseClient.from('registrations').select('id',{count:'exact',head:true}),
  ]);
  if($('statStudents')) $('statStudents').textContent = s.count ?? 0;
  if($('statDoctors')) $('statDoctors').textContent = d.count ?? 0;
  if($('statCourses')) $('statCourses').textContent = c.count ?? 0;
  if($('statRegs')) $('statRegs').textContent = r.count ?? 0;
}

async function loadDoctorsSelect(){
  const { data } = await supabaseClient.from('profiles').select('id,full_name').eq('role','doctor').eq('status','active');
  const sel = $('courseDoctor');
  if(!sel) return;
  sel.innerHTML = '<option value="">-- اختر دكتوراً --</option>';
  (data||[]).forEach(d=>{
    const opt = document.createElement('option');
    opt.value = d.id; opt.textContent = d.full_name;
    sel.appendChild(opt);
  });
}

async function loadAdminCourses(){
  const { data } = await supabaseClient.from('courses').select('*, doctor:profiles(full_name)').order('course_code');
  const tbody = $('adminCoursesTable')?.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  (data||[]).forEach(c=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${c.course_code}</td>
      <td>${c.course_name}</td>
      <td>${c.doctor?.full_name||'-'}</td>
      <td>${c.enrolled_count}/${c.capacity}</td>
      <td></td>
    `;
    const edit = document.createElement('button'); edit.className='btn'; edit.textContent='تعديل';
    edit.addEventListener('click', ()=>fillCourseForm(c));
    const del = document.createElement('button'); del.className='btn danger'; del.textContent='حذف'; del.style.marginInlineStart='6px';
    del.addEventListener('click', ()=>deleteCourse(c.id));
    tr.lastElementChild.appendChild(edit);
    tr.lastElementChild.appendChild(del);
    tbody.appendChild(tr);
  });
}

function fillCourseForm(c){
  if($('courseId')) $('courseId').value = c.id;
  if($('courseCode')) $('courseCode').value = c.course_code;
  if($('courseName')) $('courseName').value = c.course_name;
  if($('courseDesc')) $('courseDesc').value = c.description||'';
  if($('courseDoctor')) $('courseDoctor').value = c.doctor_id||'';
  if($('courseCredits')) $('courseCredits').value = c.credit_hours;
  if($('courseCapacity')) $('courseCapacity').value = c.capacity;
  if($('courseSchedule')) $('courseSchedule').value = c.schedule||'';
}

function clearCourseForm(){
  if($('courseId')) $('courseId').value='';
  if($('courseCode')) $('courseCode').value='';
  if($('courseName')) $('courseName').value='';
  if($('courseDesc')) $('courseDesc').value='';
  if($('courseDoctor')) $('courseDoctor').value='';
  if($('courseCredits')) $('courseCredits').value='';
  if($('courseCapacity')) $('courseCapacity').value='';
  if($('courseSchedule')) $('courseSchedule').value='';
  clearMsg($('courseMsg'));
}

async function saveCourse(){
  clearMsg($('courseMsg'));
  const payload = {
    course_code: $('courseCode').value.trim(),
    course_name: $('courseName').value.trim(),
    description: $('courseDesc').value.trim(),
    doctor_id: $('courseDoctor').value || null,
    credit_hours: parseInt($('courseCredits').value||'0',10),
    capacity: parseInt($('courseCapacity').value||'0',10),
    schedule: $('courseSchedule').value.trim(),
  };
  if(!payload.course_code || !payload.course_name || !payload.capacity){
    showMsg($('courseMsg'),'أدخل الرمز والاسم والسعة','error'); return;
  }
  const id = $('courseId').value;
  let res;
  if(id){
    res = await supabaseClient.from('courses').update(payload).eq('id', id);
  } else {
    res = await supabaseClient.from('courses').insert(payload);
  }
  if(res.error){ showMsg($('courseMsg'), res.error.message, 'error'); return; }
  showMsg($('courseMsg'),'تم الحفظ','success');
  clearCourseForm();
  await loadAdminCourses();
  await loadStats();
}

async function deleteCourse(id){
  if(!confirm('حذف المقرر؟')) return;
  const { error } = await supabaseClient.from('courses').delete().eq('id', id);
  if(error){ alert(error.message); return; }
  await loadAdminCourses();
  await loadStats();
}

async function loadAdminUsers(){
  const { data } = await supabaseClient.from('profiles').select('*').order('created_at');
  const tbody = $('adminUsersTable')?.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  (data||[]).forEach(u=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${u.full_name}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u.status}</td>
      <td></td>
    `;
    const toggle = document.createElement('button');
    toggle.className = 'btn outline';
    toggle.textContent = u.status === 'active' ? 'تعطيل' : 'تفعيل';
    toggle.addEventListener('click', async ()=>{
      const newStatus = u.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabaseClient.from('profiles').update({status:newStatus}).eq('id', u.id);
      if(error){ alert(error.message); return; }
      await loadAdminUsers();
      await loadStats();
    });
    tr.lastElementChild.appendChild(toggle);
    tbody.appendChild(tr);
  });
}

async function loadAdminRegistrations(){
  const { data } = await supabaseClient.from('registrations')
    .select('registration_date, student:profiles(full_name), course:courses(course_code,course_name)')
    .order('registration_date', {ascending:false});
  const tbody = $('adminRegsTable')?.querySelector('tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  (data||[]).forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.student?.full_name||'-'}</td>
      <td>${r.course?.course_code||''} - ${r.course?.course_name||''}</td>
      <td>${new Date(r.registration_date).toLocaleString('ar')}</td>
    `;
    tbody.appendChild(tr);
  });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}