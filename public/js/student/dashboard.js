document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('student')) return;
  initSidebar();
  
  const user = Auth.getUser();
  document.getElementById('welcome-name').textContent = user.name;

  try {
    const stats = await API.get('/dashboard/stats');
    
    // Counters
    document.getElementById('stat-attendance').textContent = `${stats.attPct}%`;
    document.getElementById('stat-cgpa').textContent = stats.cgpa;
    document.getElementById('stat-fees').textContent = formatCurrency(stats.pendingFees);

    // Recent results
    const tbody = document.getElementById('recent-results-tbody');
    tbody.innerHTML = '';
    if (stats.recentResults?.length) {
      stats.recentResults.forEach(r => {
        tbody.innerHTML += `
          <tr>
            <td class="fw-600">${r.course_code}</td>
            <td style="text-transform: capitalize;">${r.exam_type}</td>
            <td>${r.marks_obtained} / ${r.max_marks}</td>
            <td>${gradeBadge(r.grade)}</td>
          </tr>
        `;
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent results</td></tr>';
    }

    // Announcements
    const notifsBox = document.getElementById('dashboard-notifs');
    notifsBox.innerHTML = '';
    if (stats.notifications?.length) {
      stats.notifications.forEach(n => {
        notifsBox.innerHTML += `
          <div class="alert alert-${n.type}">
            <div style="font-size:16px;">${n.type === 'danger' ? '🚨' : n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'}</div>
            <div class="w-100">
              <div class="d-flex justify-between w-100">
                <strong style="font-size:13px;">${n.title}</strong>
                <span class="text-muted" style="font-size:11px;">${formatDate(n.created_at)}</span>
              </div>
              <div style="font-size:12px; margin-top:2px;">${n.message}</div>
            </div>
          </div>
        `;
      });
    } else {
      notifsBox.innerHTML = '<div class="empty-state" style="padding:20px;"><p>No new announcements</p></div>';
    }

  } catch (err) {
    showToast('Failed to load dashboard', 'error');
  }
});
