document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth('admin')) return;
  initSidebar();

  let allNotifications = [];

  const loadNotifications = async () => {
    try {
      allNotifications = await API.get('/notifications');
      renderNotifications();
    } catch (err) {
      showToast('Error loading notifications', 'error');
    }
  };

  const renderNotifications = () => {
    const list = document.getElementById('notificationsList');
    list.innerHTML = '';
    
    if (!allNotifications.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><p>No active announcements.</p></div>`;
      return;
    }

    allNotifications.forEach(n => {
      const isMuted = n.is_active === 0;
      list.innerHTML += `
        <div class="alert alert-${n.type}" style="flex-direction:column; gap:12px; ${isMuted ? 'opacity:0.6;' : ''}">
          <div class="d-flex justify-between align-center w-100">
            <h3 style="font-size:16px; margin:0;" class="fw-700">${n.title}</h3>
            <div>
              <span class="badge badge-muted" style="margin-right:12px">To: ${n.target_role.toUpperCase()}</span>
              <button class="btn btn-secondary btn-sm" style="padding:4px 8px" onclick="editNotif(${n.id})">✏️</button>
              <button class="btn btn-secondary btn-sm" style="padding:4px 8px" onclick="deleteNotif(${n.id})">🗑️</button>
            </div>
          </div>
          <p style="margin:0; font-size:14px; opacity:0.9;">${n.message}</p>
          <div class="text-muted" style="font-size:11px;">Posted on ${formatDate(n.created_at)}</div>
        </div>
      `;
    });
  };

  document.getElementById('notifForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true;
    btn.textContent = 'Publishing...';

    const id = document.getElementById('notifId').value;
    const body = {
      title: document.getElementById('title').value,
      message: document.getElementById('message').value,
      type: document.getElementById('type').value,
      target_role: document.getElementById('targetRole').value
    };

    try {
      if (id) {
        await API.put(`/notifications/${id}`, body);
        showToast('Announcement updated', 'success');
      } else {
        await API.post('/notifications', body);
        showToast('Announcement published', 'success');
      }
      closeModal('notifModal');
      loadNotifications();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publish';
    }
  });

  window.editNotif = (id) => {
    const n = allNotifications.find(x => x.id === id);
    if (!n) return;
    
    document.getElementById('modalTitle').textContent = 'Edit Announcement';
    document.getElementById('notifId').value = n.id;
    document.getElementById('title').value = n.title;
    document.getElementById('message').value = n.message;
    document.getElementById('type').value = n.type || 'info';
    document.getElementById('targetRole').value = n.target_role || 'all';
    
    openModal('notifModal');
  };

  window.deleteNotif = async (id) => {
    if (!confirmDelete()) return;
    try {
      await API.delete(`/notifications/${id}`);
      showToast('Announcement removed', 'success');
      loadNotifications();
    } catch (err) { showToast(err.message, 'error'); }
  };

  window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (id === 'notifModal' && !document.getElementById('notifId').value) {
      document.getElementById('notifForm').reset();
      document.getElementById('modalTitle').textContent = 'Create Announcement';
      document.getElementById('notifId').value = '';
    }
    modal.classList.add('show');
  };

  loadNotifications();
});
