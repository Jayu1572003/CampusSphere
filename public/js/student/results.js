document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('student')) return;
  initSidebar();

  const user = Auth.getUser();

  // Load GPA overview
  try {
    const gpaData = await API.get(`/results/gpa/${user.student_id}`);
    
    document.getElementById('cgpa-display').textContent = gpaData.cgpa || 'N/A';

    const tbody = document.getElementById('sem-gpa-tbody');
    tbody.innerHTML = '';

    if (gpaData.semester_gpa && gpaData.semester_gpa.length) {
      gpaData.semester_gpa.forEach(sem => {
        tbody.innerHTML += `
          <tr>
            <td class="fw-600">Semester ${sem.semester}</td>
            <td>${sem.courses}</td>
            <td class="fw-700 text-primary">${sem.gpa}</td>
          </tr>
        `;
      });
      
      const ctx = document.getElementById('gpaChart');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: gpaData.semester_gpa.map(s => `Sem ${s.semester}`),
          datasets: [{
            label: 'GPA',
            data: gpaData.semester_gpa.map(s => s.gpa),
            borderColor: '#6C63FF',
            backgroundColor: 'rgba(108,99,255,0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#4ECDC4',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 10, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8888AA' } },
            x: { grid: { display: false }, ticks: { color: '#8888AA' } }
          }
        }
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No completed semesters yet</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }

  // Load Detailed Grades
  const loadResults = async () => {
    try {
      const semester = document.getElementById('semesterFilter').value;
      let url = '/results?';
      if (semester) url += `&semester=${semester}`;

      const results = await API.get(url);
      const tbody = document.getElementById('results-tbody');
      tbody.innerHTML = '';

      if (!results.length) {
        tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">🏆</div><p>No results found.</p></div></td></tr>`;
        return;
      }

      results.forEach(r => {
        tbody.innerHTML += `
          <tr>
            <td class="fw-600 text-primary">${r.course_code}</td>
            <td>
              <div class="fw-600">${r.course_name}</div>
              <div class="text-muted" style="font-size:12px">Semester ${r.semester}</div>
            </td>
            <td style="text-transform: capitalize;">${r.exam_type}</td>
            <td class="fw-700">${r.marks_obtained}</td>
            <td class="text-muted">${r.max_marks}</td>
            <td>${gradeBadge(r.grade)}</td>
          </tr>
        `;
      });
    } catch (err) {
      showToast('Error loading results', 'error');
    }
  };

  document.getElementById('semesterFilter').addEventListener('change', loadResults);
  loadResults();
});

// Print/PDF overriding for nice transcripts
window.addEventListener('beforeprint', () => {
  document.body.style.background = 'white';
  document.body.style.color = 'black';
  document.querySelector('.sidebar').style.display = 'none';
  document.querySelector('.main-content').style.marginLeft = '0';
});
window.addEventListener('afterprint', () => {
  document.body.style.background = '';
  document.body.style.color = '';
  document.querySelector('.sidebar').style.display = '';
  document.querySelector('.main-content').style.marginLeft = '';
});
