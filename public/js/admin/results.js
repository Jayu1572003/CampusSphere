document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('admin')) return;
  initSidebar();

  let allResults = [];

  // Load dropdowns
  try {
    const [studentsRes, coursesRes] = await Promise.all([
      API.get('/students?limit=1000'),
      API.get('/courses')
    ]);
    const studentSelect = document.getElementById('studentId');
    const courseSelect = document.getElementById('courseId');
    
    studentsRes.students.forEach(s => {
      studentSelect.innerHTML += `<option value="${s.id}">${s.student_number} - ${s.first_name} ${s.last_name}</option>`;
    });
    coursesRes.forEach(c => {
      courseSelect.innerHTML += `<option value="${c.id}">${c.course_code} - ${c.course_name}</option>`;
    });
  } catch (err) {}

  const loadResults = async () => {
    try {
      const semester = document.getElementById('semesterFilter').value;
      const examType = document.getElementById('examTypeFilter').value;
      const search = document.getElementById('searchInput').value.toLowerCase();
      
      let url = '/results?';
      if (semester) url += `&semester=${semester}`;
      if (examType) url += `&examType=${examType}`;

      allResults = await API.get(url);
      
      if (search) {
        allResults = allResults.filter(r => 
          r.first_name.toLowerCase().includes(search) || 
          r.last_name.toLowerCase().includes(search) || 
          r.student_number.toLowerCase().includes(search) ||
          r.course_code.toLowerCase().includes(search) ||
          r.course_name.toLowerCase().includes(search)
        );
      }
      renderResults();
    } catch (err) {
      showToast('Error loading results', 'error');
    }
  };

  const renderResults = () => {
    const tbody = document.getElementById('results-tbody');
    tbody.innerHTML = '';
    
    if (!allResults.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🏆</div><p>No results found.</p></div></td></tr>`;
      return;
    }

    allResults.forEach(r => {
      const pct = (r.marks_obtained / r.max_marks * 100).toFixed(1);
      tbody.innerHTML += `
        <tr>
          <td>
            <div class="fw-600">${r.first_name} ${r.last_name}</div>
            <div class="text-muted" style="font-size:12px">${r.student_number}</div>
          </td>
          <td>
            <div class="fw-600">${r.course_code}</div>
            <div class="text-muted truncate" style="font-size:12px; max-width:180px;">${r.course_name}</div>
          </td>
          <td>
            <div style="text-transform: capitalize;">${r.exam_type}</div>
            <div class="text-muted" style="font-size:12px">Sem ${r.semester}</div>
          </td>
          <td>
            <div class="fw-700">${r.marks_obtained} <span class="text-muted" style="font-weight:400">/ ${r.max_marks}</span></div>
            <div style="font-size:11px; color: ${pct < 40 ? 'var(--danger)' : 'var(--success)'}">${pct}%</div>
          </td>
          <td>${gradeBadge(r.grade)}</td>
          <td class="text-right">
            <button class="btn btn-secondary btn-sm" onclick="editResult(${r.id})">✏️</button>
            <button class="btn btn-secondary btn-sm" onclick="deleteResult(${r.id})">🗑️</button>
          </td>
        </tr>
      `;
    });
  };

  document.getElementById('semesterFilter').addEventListener('change', loadResults);
  document.getElementById('examTypeFilter').addEventListener('change', loadResults);
  document.getElementById('searchInput').addEventListener('input', loadResults);

  document.getElementById('resultForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('resultId').value;
    const body = {
      student_id: document.getElementById('studentId').value,
      course_id: document.getElementById('courseId').value,
      exam_type: document.getElementById('examType').value,
      semester: parseInt(document.getElementById('semester').value),
      marks_obtained: parseFloat(document.getElementById('marksObtained').value),
      max_marks: parseFloat(document.getElementById('maxMarks').value)
    };
    const grade = document.getElementById('grade').value;
    if (grade) body.grade = grade;

    try {
      if (id) {
        await API.put(`/results/${id}`, body);
        showToast('Result updated', 'success');
      } else {
        await API.post('/results', body);
        showToast('Result posted', 'success');
      }
      closeModal('resultModal');
      loadResults();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Result';
    }
  });

  window.editResult = (id) => {
    const r = allResults.find(x => x.id === id);
    if (!r) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Result';
    document.getElementById('resultId').value = r.id;
    document.getElementById('studentId').value = r.student_id;
    document.getElementById('studentSelectGroup').style.display = 'none'; // prevent changing student
    document.getElementById('courseId').value = r.course_id;
    document.getElementById('examType').value = r.exam_type;
    document.getElementById('semester').value = r.semester;
    document.getElementById('marksObtained').value = r.marks_obtained;
    document.getElementById('maxMarks').value = r.max_marks;
    document.getElementById('grade').value = r.grade || '';
    
    openModal('resultModal');
  };

  window.deleteResult = async (id) => {
    if (!confirmDelete()) return;
    try {
      await API.delete(`/results/${id}`);
      showToast('Result deleted', 'success');
      loadResults();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (id === 'resultModal' && !document.getElementById('resultId').value) {
      document.getElementById('resultForm').reset();
      document.getElementById('modalTitle').textContent = 'Add Result';
      document.getElementById('resultId').value = '';
      document.getElementById('studentSelectGroup').style.display = 'block';
    }
    modal.classList.add('show');
  };

  loadResults();
});
