document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('student')) return;
  initSidebar();

  const user = Auth.getUser();

  try {
    const stats = await API.get('/dashboard/stats');
    const student = stats.student;
    
    // Header
    document.getElementById('fullName').textContent = `${student.first_name} ${student.last_name}`;
    document.getElementById('studentNumber').textContent = student.student_number;
    document.getElementById('profile-avatar').textContent = initials(`${student.first_name} ${student.last_name}`);
    document.getElementById('programBadge').textContent = student.program;
    document.getElementById('semesterBadge').textContent = `Semester ${student.semester}`;
    document.getElementById('statusBadge').textContent = student.status.toUpperCase();
    
    if (student.status !== 'active') {
      document.getElementById('statusBadge').className = `badge badge-${student.status === 'graduated' ? 'info' : 'danger'}`;
    }

    // Form fields
    document.getElementById('firstName').value = student.first_name;
    document.getElementById('lastName').value = student.last_name;
    document.getElementById('email').value = student.email;
    document.getElementById('phone').value = student.phone || '';
    document.getElementById('dob').value = student.date_of_birth || '';
    document.getElementById('gender').value = student.gender || '';
    document.getElementById('address').value = student.address || '';

  } catch (err) {
    showToast('Failed to load profile details', 'error');
  }

  // Update logic
  document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const body = {
      first_name: document.getElementById('firstName').value,
      last_name: document.getElementById('lastName').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      date_of_birth: document.getElementById('dob').value,
      gender: document.getElementById('gender').value,
      address: document.getElementById('address').value
    };

    try {
      await API.put(`/students/${user.student_id}`, body);
      showToast('Profile updated successfully', 'success');
      
      // Update sidebar if name changed
      document.getElementById('sidebar-user-name').textContent = `${body.first_name} ${body.last_name}`;
      document.getElementById('profile-avatar').textContent = initials(`${body.first_name} ${body.last_name}`);
      document.getElementById('fullName').textContent = `${body.first_name} ${body.last_name}`;
      
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Changes';
    }
  });
});
