document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('student')) return;
  initSidebar();

  const loadFees = async () => {
    try {
      const status = document.getElementById('statusFilter').value;
      const user = Auth.getUser();
      
      let url = `/fees?student_id=${user.student_id}`;
      if (status) url += `&status=${status}`;

      const [records, summary] = await Promise.all([
        API.get(url),
        API.get(`/fees/summary?student_id=${user.student_id}`)
      ]);
      
      // Render Stats
      const totals = summary.totals;
      document.getElementById('feeStats').innerHTML = `
        <div class="stat-card green">
          <div class="stat-icon green">✅</div>
          <div class="stat-value">${formatCurrency(totals.paid)}</div>
          <div class="stat-label">Total Paid</div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon red">⏳</div>
          <div class="stat-value">${formatCurrency(totals.pending)}</div>
          <div class="stat-label">Total Pending</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple">💰</div>
          <div class="stat-value">${formatCurrency(totals.total)}</div>
          <div class="stat-label">Total Billed</div>
        </div>
      `;

      // Render Table
      const tbody = document.getElementById('fees-tbody');
      tbody.innerHTML = '';
      
      if (!records.length) {
        tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="empty-icon">💳</div><p>No fee records found.</p></div></td></tr>`;
        return;
      }

      records.forEach(f => {
        tbody.innerHTML += `
          <tr>
            <td>
              <div class="fw-600">${f.fee_type}</div>
              <div class="text-muted" style="font-size:12px">Semester ${f.semester || '—'}</div>
            </td>
            <td class="fw-700">${formatCurrency(f.amount)}</td>
            <td>${formatDate(f.due_date)}</td>
            <td>${statusBadge(f.status)}</td>
            <td>
              <div style="font-size:12px">
                ${f.status === 'paid' ? `
                  <span class="text-success fw-600">Paid on ${formatDate(f.paid_date)}</span><br>
                  <span class="text-muted">TXN: ${f.transaction_id || 'Cash/Manual'}</span>
                ` : `
                  <span class="text-warning">Awaiting Payment</span><br>
                  <span class="text-muted">${f.remarks || 'Pay before due date'}</span>
                `}
              </div>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      showToast('Error loading fees', 'error');
    }
  };

  document.getElementById('statusFilter').addEventListener('change', loadFees);
  loadFees();
});
