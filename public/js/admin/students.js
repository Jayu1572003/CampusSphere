document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth('admin')) return;
  initSidebar();

  let allStudents = [];

  const loadStudents = async () => {
    try {
      const search = document.getElementById('searchInput').value;
      const program = document.getElementById('programFilter').value;
      const status = document.getElementById('statusFilter').value;
      
      let url = '/students?limit=100';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (program) url += `&program=${encodeURIComponent(program)}`;
      if (status) url += `&status=${encodeURIComponent(status)}`;

      const res = await API.get(url);
      allStudents = res.students;
      renderStudents();
    } catch (err) {
      showToast('Error loading students', 'error');
    }
  };

  const renderStudents = () => {
    const tbody = document.getElementById('students-tbody');
    tbody.innerHTML = '';
    
    if (!allStudents.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">📂</div><p>No students found matching your criteria.</p></div></td></tr>`;
      return;
    }

    allStudents.forEach(s => {
      tbody.innerHTML += `
        <tr>
          <td class="fw-600 text-primary">${s.student_number}</td>
          <td>
            <div class="d-flex align-center gap-12">
              <div class="avatar">${initials(s.first_name + ' ' + s.last_name)}</div>
              <div>
                <div class="fw-600">${s.first_name} ${s.last_name}</div>
                <div class="text-muted" style="font-size:12px">${s.email}</div>
              </div>
            </div>
          </td>
          <td>${s.program}</td>
          <td>Sem ${s.semester}</td>
          <td>${statusBadge(s.status)}</td>
          <td class="text-right">
            <button class="btn btn-secondary btn-sm" onclick="editStudent(${s.id})">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="deleteStudent(${s.id})">🗑️</button>
          </td>
        </tr>
      `;
    });
  };

  // Filters
  document.getElementById('searchInput').addEventListener('input', loadStudents);
  document.getElementById('programFilter').addEventListener('change', loadStudents);
  document.getElementById('statusFilter').addEventListener('change', loadStudents);

  // Form Submit
  document.getElementById('studentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('studentId').value;
    const body = {
      first_name: document.getElementById('firstName').value,
      last_name: document.getElementById('lastName').value,
      student_number: document.getElementById('studentNumber').value,
      email: document.getElementById('email').value,
      program: document.getElementById('program').value,
      semester: parseInt(document.getElementById('semester').value),
      phone: document.getElementById('phone').value,
      status: document.getElementById('status').value
    };

    if (!id) {
      const pwd = document.getElementById('password').value;
      if (pwd) body.password = pwd;
    }

    try {
      if (id) {
        await API.put(`/students/${id}`, body);
        showToast('Student updated securely', 'success');
      } else {
        await API.post('/students', body);
        showToast('New student registered', 'success');
      }
      closeModal('studentModal');
      loadStudents();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Student';
    }
  });

  // Expose to window for inline handlers
  window.editStudent = (id) => {
    const s = allStudents.find(x => x.id === id);
    if (!s) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Student';
    document.getElementById('studentId').value = s.id;
    document.getElementById('firstName').value = s.first_name;
    document.getElementById('lastName').value = s.last_name;
    document.getElementById('studentNumber').value = s.student_number;
    document.getElementById('email').value = s.email;
    document.getElementById('program').value = s.program;
    document.getElementById('semester').value = s.semester || 1;
    document.getElementById('phone').value = s.phone || '';
    document.getElementById('status').value = s.status || 'active';
    document.getElementById('pwdGroup').style.display = 'none';
    
    openModal('studentModal');
  };

  window.deleteStudent = async (id) => {
    if (!confirmDelete('Are you sure you want to permanently delete this student record?')) return;
    try {
      await API.delete(`/students/${id}`);
      showToast('Student deleted', 'success');
      loadStudents();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Reset form when opening to add
  window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (id === 'studentModal' && !document.getElementById('studentId').value) {
      document.getElementById('studentForm').reset();
      document.getElementById('modalTitle').textContent = 'Register New Student';
      document.getElementById('studentId').value = '';
      document.getElementById('pwdGroup').style.display = 'block';
    }
    modal.classList.add('show');
  };

  // Initial load
  loadStudents();
});
