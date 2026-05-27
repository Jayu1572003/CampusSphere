document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth('admin')) return;
  initSidebar();

  let allCourses = [];

  const loadCourses = async () => {
    try {
      const program = document.getElementById('programFilter').value;
      const semester = document.getElementById('semesterFilter').value;
      
      let url = '/courses?';
      if (program) url += `&program=${encodeURIComponent(program)}`;
      if (semester) url += `&semester=${encodeURIComponent(semester)}`;

      allCourses = await API.get(url);
      renderCourses();
    } catch (err) {
      showToast('Error loading courses', 'error');
    }
  };

  const renderCourses = () => {
    const tbody = document.getElementById('courses-tbody');
    tbody.innerHTML = '';
    
    if (!allCourses.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📚</div><p>No courses found.</p></div></td></tr>`;
      return;
    }

    allCourses.forEach(c => {
      tbody.innerHTML += `
        <tr>
          <td class="fw-600 text-primary">${c.course_code}</td>
          <td class="fw-600">${c.course_name}</td>
          <td>${c.program || 'All'}</td>
          <td>Sem ${c.semester}</td>
          <td>${c.credits}</td>
          <td>${c.instructor || 'Unassigned'}</td>
          <td class="text-right">
            <button class="btn btn-secondary btn-sm" onclick="editCourse(${c.id})">✏️ Edit</button>
            <button class="btn btn-secondary btn-sm" onclick="deleteCourse(${c.id})">🗑️</button>
          </td>
        </tr>
      `;
    });
  };

  document.getElementById('programFilter').addEventListener('change', loadCourses);
  document.getElementById('semesterFilter').addEventListener('change', loadCourses);

  document.getElementById('courseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('courseId').value;
    const body = {
      course_code: document.getElementById('courseCode').value,
      course_name: document.getElementById('courseName').value,
      program: document.getElementById('program').value,
      semester: parseInt(document.getElementById('semester').value),
      credits: parseInt(document.getElementById('credits').value),
      instructor: document.getElementById('instructor').value
    };

    try {
      if (id) {
        await API.put(`/courses/${id}`, body);
        showToast('Course updated', 'success');
      } else {
        await API.post('/courses', body);
        showToast('Course added', 'success');
      }
      closeModal('courseModal');
      loadCourses();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Course';
    }
  });

  window.editCourse = (id) => {
    const c = allCourses.find(x => x.id === id);
    if (!c) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Course';
    document.getElementById('courseId').value = c.id;
    document.getElementById('courseCode').value = c.course_code;
    document.getElementById('courseName').value = c.course_name;
    document.getElementById('program').value = c.program || 'All';
    document.getElementById('semester').value = c.semester || 1;
    document.getElementById('credits').value = c.credits || 3;
    document.getElementById('instructor').value = c.instructor || '';
    
    openModal('courseModal');
  };

  window.deleteCourse = async (id) => {
    if (!confirmDelete('Delete this course? This might affect students currently enrolled.')) return;
    try {
      await API.delete(`/courses/${id}`);
      showToast('Course deleted', 'success');
      loadCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (id === 'courseModal' && !document.getElementById('courseId').value) {
      document.getElementById('courseForm').reset();
      document.getElementById('modalTitle').textContent = 'Add New Course';
      document.getElementById('courseId').value = '';
    }
    modal.classList.add('show');
  };

  loadCourses();
});
