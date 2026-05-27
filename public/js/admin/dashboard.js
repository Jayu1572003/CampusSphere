document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('admin')) return;
  initSidebar();
  
  const user = Auth.getUser();
  document.getElementById('welcome-name').textContent = user.name;

  try {
    const stats = await API.get('/dashboard/stats');
    
    // Update summary counters
    document.getElementById('stat-students').textContent = stats.totalStudents || 0;
    document.getElementById('stat-courses').textContent = stats.totalCourses || 0;
    document.getElementById('stat-attendance').textContent = `${stats.attendancePct}%`;
    document.getElementById('stat-fees').textContent = formatCurrency(stats.pendingFees);

    if (stats.notifications > 0) {
      document.getElementById('notifBadge').style.display = 'block';
    }

    // Populate recent students
    const tbody = document.getElementById('recent-students-tbody');
    tbody.innerHTML = '';
    if (stats.recentStudents && stats.recentStudents.length) {
      stats.recentStudents.forEach(s => {
        tbody.innerHTML += `
          <tr>
            <td class="fw-600">${s.student_number}</td>
            <td>
              <div class="d-flex align-center gap-12">
                <div class="avatar" style="width:28px;height:28px;font-size:11px;">${initials(s.first_name + ' ' + s.last_name)}</div>
                <span>${s.first_name} ${s.last_name}</span>
              </div>
            </td>
            <td>${s.program}</td>
            <td>Sem ${s.semester}</td>
            <td>${statusBadge(s.status)}</td>
            <td class="text-muted">${formatDate(s.created_at)}</td>
          </tr>
        `;
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No students found</td></tr>`;
    }

    // Process Chart Data
    // Program Chart
    const pCtx = document.getElementById('programChart');
    if (pCtx && stats.programDist && stats.programDist.length) {
      new Chart(pCtx, {
        type: 'doughnut',
        data: {
          labels: stats.programDist.map(d => d.program),
          datasets: [{
            data: stats.programDist.map(d => d.count),
            backgroundColor: ['#6C63FF', '#4ECDC4', '#FFD93D', '#FF6B6B', '#4D96FF', '#9D4EDD'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#E8E8F0', font: { family: 'Inter' } } }
          },
          cutout: '70%'
        }
      });
    }

    // Fees Chart
    const fCtx = document.getElementById('feeChart');
    if (fCtx && stats.feeStatus) {
      const labels = stats.feeStatus.map(f => f.status.toUpperCase());
      const amounts = stats.feeStatus.map(f => f.total);
      new Chart(fCtx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Amount (₹)',
            data: amounts,
            backgroundColor: labels.map(l => l === 'PAID' ? '#6BCB77' : l === 'PENDING' ? '#FFD93D' : '#FF6B6B'),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8888AA' } },
            x: { grid: { display: false }, ticks: { color: '#8888AA' } }
          }
        }
      });
    }

  } catch (err) {
    showToast('Failed to load dashboard data', 'error');
    console.error(err);
  }
});
