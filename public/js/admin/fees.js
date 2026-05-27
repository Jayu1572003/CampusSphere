document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth('admin')) return;
  initSidebar();

  let allFees = [];

  // Load students for the dropdown
  try {
    const res = await API.get('/students?limit=1000');
    const select = document.getElementById('studentId');
    select.innerHTML = '<option value="">Select Student</option>';
    res.students.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.student_number} - ${s.first_name} ${s.last_name}</option>`;
    });
  } catch (err) {}

  const loadFees = async () => {
    try {
      const status = document.getElementById('statusFilter').value;
      const search = document.getElementById('searchInput').value.toLowerCase();
      
      let url = '/fees?';
      if (status) url += `&status=${status}`;

      allFees = await API.get(url);
      
      if (search) {
        allFees = allFees.filter(f => 
          f.first_name.toLowerCase().includes(search) || 
          f.last_name.toLowerCase().includes(search) || 
          f.student_number.toLowerCase().includes(search) ||
          (f.transaction_id && f.transaction_id.toLowerCase().includes(search))
        );
      }

      renderFees();
      updateStats();
    } catch (err) {
      showToast('Error loading fees', 'error');
    }
  };

  const renderFees = () => {
    const tbody = document.getElementById('fees-tbody');
    tbody.innerHTML = '';
    
    if (!allFees.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-icon">💳</div><p>No fee records found.</p></div></td></tr>`;
      return;
    }

    allFees.forEach(f => {
      tbody.innerHTML += `
        <tr>
          <td>
            <div class="fw-600">${f.first_name} ${f.last_name}</div>
            <div class="text-muted" style="font-size:12px">${f.student_number}</div>
          </td>
          <td>
            <div class="fw-600">${f.fee_type}</div>
            <div class="text-muted" style="font-size:12px">Sem ${f.semester || '-'}</div>
          </td>
          <td class="fw-700">${formatCurrency(f.amount)}</td>
          <td>${statusBadge(f.status)}</td>
          <td>
            <div style="font-size:12px">
              <span class="text-muted">Due:</span> ${formatDate(f.due_date)}<br>
              <span class="text-muted">Paid:</span> ${formatDate(f.paid_date)}
            </div>
          </td>
          <td class="text-right">
            ${f.status !== 'paid' ? `<button class="btn btn-success btn-sm" onclick="markPaid(${f.id})">Mark Paid</button>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="editFee(${f.id})">✏️</button>
            <button class="btn btn-secondary btn-sm" onclick="deleteFee(${f.id})">🗑️</button>
          </td>
        </tr>
      `;
    });
  };

  const updateStats = async () => {
    try {
      const summary = await API.get('/fees/summary');
      const stats = document.getElementById('feeStats');
      let paid = 0, pending = 0;
      summary.forEach(s => {
        if (s.status === 'paid') paid = s.total;
        if (s.status === 'pending' || s.status === 'overdue') pending += s.total;
      });

      stats.innerHTML = `
        <div class="stat-card green">
          <div class="stat-icon green">💰</div>
          <div class="stat-value">${formatCurrency(paid)}</div>
          <div class="stat-label">Total Collected</div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon red">⏳</div>
          <div class="stat-value">${formatCurrency(pending)}</div>
          <div class="stat-label">Pending Collection</div>
        </div>
      `;
    } catch (err) {}
  };

  document.getElementById('statusFilter').addEventListener('change', loadFees);
  document.getElementById('searchInput').addEventListener('input', loadFees);

  document.getElementById('feeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const id = document.getElementById('feeId').value;
    const body = {
      student_id: document.getElementById('studentId').value,
      fee_type: document.getElementById('feeType').value,
      amount: document.getElementById('amount').value,
      status: document.getElementById('status').value,
      semester: document.getElementById('semester').value,
      due_date: document.getElementById('dueDate').value,
      paid_date: document.getElementById('paidDate').value,
      transaction_id: document.getElementById('transactionId').value
    };

    try {
      if (id) {
        await API.put(`/fees/${id}`, body);
        showToast('Fee record updated', 'success');
      } else {
        await API.post('/fees', body);
        showToast('Fee record created', 'success');
      }
      closeModal('feeModal');
      loadFees();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save Record';
    }
  });

  window.editFee = (id) => {
    const f = allFees.find(x => x.id === id);
    if (!f) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Fee Record';
    document.getElementById('feeId').value = f.id;
    document.getElementById('studentId').value = f.student_id;
    document.getElementById('studentSelectGroup').style.display = 'none'; // prevent changing student
    document.getElementById('feeType').value = f.fee_type;
    document.getElementById('amount').value = f.amount;
    document.getElementById('status').value = f.status || 'pending';
    document.getElementById('semester').value = f.semester || '';
    document.getElementById('dueDate').value = f.due_date || '';
    document.getElementById('paidDate').value = f.paid_date || '';
    document.getElementById('transactionId').value = f.transaction_id || f.remarks || '';
    
    openModal('feeModal');
  };

  window.markPaid = async (id) => {
    try {
      await API.put(`/fees/${id}`, { 
        status: 'paid', 
        paid_date: new Date().toISOString().split('T')[0],
        transaction_id: 'CASH-' + Date.now().toString().slice(-6)
      });
      showToast('Marked as paid', 'success');
      loadFees();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.deleteFee = async (id) => {
    if (!confirmDelete()) return;
    try {
      await API.delete(`/fees/${id}`);
      showToast('Record deleted', 'success');
      loadFees();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (id === 'feeModal' && !document.getElementById('feeId').value) {
      document.getElementById('feeForm').reset();
      document.getElementById('modalTitle').textContent = 'Record Fee';
      document.getElementById('feeId').value = '';
      document.getElementById('studentSelectGroup').style.display = 'block';
    }
    modal.classList.add('show');
  };

  loadFees();
});
