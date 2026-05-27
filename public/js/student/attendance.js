document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('student')) return;
  initSidebar();

  const user = Auth.getUser();
  const d = new Date();
  document.getElementById('monthFilter').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  try {
    // Load Summary and Chart
    const summary = await API.get(`/attendance/summary/${user.student_id}`);
    
    // Populate Course Filter
    const courseFilter = document.getElementById('courseFilter');
    summary.forEach(s => {
      courseFilter.innerHTML += `<option value="${s.course_id}">${s.course_code} - ${s.course_name}</option>`;
    });

    const tbodySum = document.getElementById('att-summary-tbody');
    tbodySum.innerHTML = '';
    
    if (summary.length) {
      summary.forEach(s => {
        tbodySum.innerHTML += `
          <tr>
            <td class="fw-600">${s.course_code}</td>
            <td>${s.total_classes}</td>
            <td>${s.present + s.late}</td>
            <td style="color: ${s.percentage < 75 ? 'var(--danger)' : 'var(--success)'}; font-weight:700;">${s.percentage}%</td>
          </tr>
        `;
      });
      
      const ctx = document.getElementById('courseAttChart');
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: summary.map(s => s.course_code),
          datasets: [{
            label: 'Attendance %',
            data: summary.map(s => s.percentage),
            backgroundColor: summary.map(s => s.percentage >= 75 ? '#6BCB77' : '#FF6B6B'),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8888AA' } },
            x: { grid: { display: false }, ticks: { color: '#8888AA' } }
          }
        }
      });
    } else {
      tbodySum.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No attendance data</td></tr>';
    }
  } catch (err) {
    console.error(err);
  }

  // Load detailed logs
  const loadLogs = async () => {
    try {
      const month = document.getElementById('monthFilter').value;
      const course = document.getElementById('courseFilter').value;
      
      let url = '/attendance?';
      if (month) url += `&month=${month}`;
      if (course) url += `&course_id=${course}`;

      const logs = await API.get(url);
      const tbody = document.getElementById('att-logs-tbody');
      tbody.innerHTML = '';

      if (!logs.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">📅</div><p>No records for this period.</p></div></td></tr>`;
        return;
      }

      logs.forEach(l => {
        tbody.innerHTML += `
          <tr>
            <td class="fw-600">${formatDate(l.date)}</td>
            <td class="fw-600 text-primary">${l.course_code}</td>
            <td>${l.course_name}</td>
            <td>${attendanceBadge(l.status)}</td>
            <td class="text-muted">${l.remarks || '—'}</td>
          </tr>
        `;
      });
    } catch (err) {
      showToast('Error loading logs', 'error');
    }
  };

  document.getElementById('monthFilter').addEventListener('change', loadLogs);
  document.getElementById('courseFilter').addEventListener('change', loadLogs);

  loadLogs();
});
