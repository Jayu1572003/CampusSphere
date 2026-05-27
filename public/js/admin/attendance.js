document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('admin')) return;
  initSidebar();

  document.getElementById('dateFilter').valueAsDate = new Date();
  
  // Load courses for filters
  try {
    const courses = await API.get('/courses');
    const courseFilter = document.getElementById('courseFilter');
    const markCourse = document.getElementById('markCourse');
    courses.forEach(c => {
      const opt = `<option value="${c.id}">${c.course_code} - ${c.course_name}</option>`;
      courseFilter.innerHTML += opt;
      markCourse.innerHTML += opt;
    });
  } catch (err) {}

  const loadAttendance = async () => {
    try {
      const date = document.getElementById('dateFilter').value;
      const course_id = document.getElementById('courseFilter').value;
      const search = document.getElementById('searchInput').value.toLowerCase();
      
      let url = '/attendance?';
      if (date) url += `&date=${date}`;
      if (course_id) url += `&course_id=${course_id}`;

      let records = await API.get(url);
      
      if (search) {
        records = records.filter(r => 
          r.first_name.toLowerCase().includes(search) || 
          r.last_name.toLowerCase().includes(search) || 
          r.student_number.toLowerCase().includes(search)
        );
      }

      const tbody = document.getElementById('attendance-tbody');
      tbody.innerHTML = '';
      
      if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📅</div><p>No attendance records found.</p></div></td></tr>`;
        return;
      }

      records.forEach(r => {
        tbody.innerHTML += `
          <tr>
            <td class="text-muted">${formatDate(r.date)}</td>
            <td>
              <div class="fw-600">${r.first_name} ${r.last_name}</div>
              <div class="text-muted" style="font-size:12px">${r.student_number}</div>
            </td>
            <td>${r.course_code}</td>
            <td>${attendanceBadge(r.status)}</td>
            <td class="text-muted">${r.remarks || '—'}</td>
            <td class="text-right">
              <button class="btn btn-secondary btn-sm" onclick="editAtt(${r.id}, '${r.status}')">Toggle Status</button>
              <button class="btn btn-secondary btn-sm" onclick="deleteAtt(${r.id})">🗑️</button>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      showToast('Error loading attendance', 'error');
    }
  };

  document.getElementById('dateFilter').addEventListener('change', loadAttendance);
  document.getElementById('courseFilter').addEventListener('change', loadAttendance);
  document.getElementById('searchInput').addEventListener('input', loadAttendance);

  // Mark group attendance logic
  let studentsForAttendance = [];
  
  document.getElementById('loadStudentsBtn').addEventListener('click', async () => {
    const courseId = document.getElementById('markCourse').value;
    const date = document.getElementById('markDate').value;
    if (!courseId || !date) return showToast('Select date and course first', 'error');

    try {
      const course = await API.get(`/courses/${courseId}`);
      let url = '/students?limit=500';
      if (course.program && course.program !== 'All') url += `&program=${encodeURIComponent(course.program)}`;
      if (course.semester) url += `&semester=${course.semester}`;
      
      const res = await API.get(url);
      studentsForAttendance = res.students;
      
      const tbody = document.getElementById('mark-attendance-tbody');
      tbody.innerHTML = '';
      studentsForAttendance.forEach(s => {
        tbody.innerHTML += `
          <tr>
            <td>${s.student_number}</td>
            <td>${s.first_name} ${s.last_name}</td>
            <td>
              <select class="form-control att-status-select" data-sid="${s.id}" style="padding:6px;width:120px;">
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
            </td>
          </tr>
        `;
      });
      document.getElementById('attendanceListWrapper').style.display = 'block';
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.getElementById('saveAttendanceBtn').addEventListener('click', async () => {
    const courseId = document.getElementById('markCourse').value;
    const date = document.getElementById('markDate').value;
    const selects = document.querySelectorAll('.att-status-select');
    
    const records = Array.from(selects).map(select => ({
      student_id: select.dataset.sid,
      course_id: courseId,
      date: date,
      status: select.value
    }));

    if (!records.length) return;

    try {
      document.getElementById('saveAttendanceBtn').disabled = true;
      document.getElementById('saveAttendanceBtn').textContent = 'Saving...';
      await API.post('/attendance', { records });
      showToast('Attendance marked successfully', 'success');
      closeModal('attendanceModal');
      loadAttendance();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      document.getElementById('saveAttendanceBtn').disabled = false;
      document.getElementById('saveAttendanceBtn').textContent = 'Save Attendance';
    }
  });

  window.editAtt = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'present' ? 'absent' : currentStatus === 'absent' ? 'late' : 'present';
    try {
      await API.put(`/attendance/${id}`, { status: nextStatus });
      loadAttendance();
    } catch (error) { showToast('Update failed', 'error'); }
  };

  window.deleteAtt = async (id) => {
    if (!confirmDelete('Delete this attendance record?')) return;
    try {
      await API.delete(`/attendance/${id}`);
      showToast('Record deleted', 'success');
      loadAttendance();
    } catch (err) { showToast(err.message, 'error'); }
  };

  loadAttendance();
});
