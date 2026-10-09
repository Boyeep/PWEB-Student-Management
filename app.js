(() => {
  'use strict';

  const STORAGE_KEY = 'pweb-student-management.v1';
  const PAGE_SIZE = 5;
  const DEPARTMENTS = ['Informatika', 'Sistem Informasi', 'Teknik Komputer', 'Manajemen'];
  const EXAMPLE_STUDENTS = [
    { id: 'student-01', nim: '5025251001', name: 'Alya Nadhira', department: 'Informatika', email: 'alya.nadhira@example.com' },
    { id: 'student-02', nim: '5025251002', name: 'Raka Pratama', department: 'Sistem Informasi', email: 'raka.pratama@example.com' },
    { id: 'student-03', nim: '5025251003', name: 'Nadia Putri', department: 'Teknik Komputer', email: 'nadia.putri@example.com' },
    { id: 'student-04', nim: '5025251004', name: 'Dimas Saputra', department: 'Manajemen', email: 'dimas.saputra@example.com' },
    { id: 'student-05', nim: '5025251005', name: 'Citra Anindya', department: 'Informatika', email: 'citra.anindya@example.com' },
    { id: 'student-06', nim: '5025251006', name: 'Farhan Maulana', department: 'Sistem Informasi', email: 'farhan.maulana@example.com' },
    { id: 'student-07', nim: '5025251007', name: 'Intan Permata', department: 'Manajemen', email: 'intan.permata@example.com' },
    { id: 'student-08', nim: '5025251008', name: 'Kevin Wijaya', department: 'Teknik Komputer', email: 'kevin.wijaya@example.com' },
    { id: 'student-09', nim: '5025251009', name: 'Salsabila Zahra', department: 'Informatika', email: 'salsabila.zahra@example.com' },
    { id: 'student-10', nim: '5025251010', name: 'Bagas Ramadhan', department: 'Manajemen', email: 'bagas.ramadhan@example.com' },
    { id: 'student-11', nim: '5025251011', name: 'Hana Kirana', department: 'Sistem Informasi', email: 'hana.kirana@example.com' },
    { id: 'student-12', nim: '5025251012', name: 'Reza Firmansyah', department: 'Teknik Komputer', email: 'reza.firmansyah@example.com' },
  ];

  const form = document.querySelector('#student-form');
  const fields = Object.fromEntries(['nim', 'name', 'department', 'email'].map(key => [key, document.getElementById(key)]));
  const formPanel = document.querySelector('#student-form-panel');
  const rows = document.querySelector('#student-rows');
  const search = document.querySelector('#search');
  const departmentFilter = document.querySelector('#department-filter');
  const pagination = document.querySelector('#pagination');
  const deleteDialog = document.querySelector('#delete-dialog');
  const aboutDialog = document.querySelector('#about-dialog');
  const storageWarning = document.querySelector('#storage-warning');
  const toast = document.querySelector('#toast');
  let currentPage = 1;
  let editingId = null;
  let pendingDeleteId = null;
  let deleteReturnFocus = null;
  let toastTimer;

  function warnStorage(message) {
    storageWarning.textContent = message;
    storageWarning.hidden = false;
  }

  function exampleStudents() {
    return EXAMPLE_STUDENTS.map(student => ({ ...student }));
  }

  function validStoredStudent(student) {
    return student && typeof student.id === 'string' && student.id.length > 0 && student.id.length <= 100
      && typeof student.nim === 'string' && /^[0-9]{6,15}$/.test(student.nim)
      && typeof student.name === 'string' && student.name.trim().length >= 2 && student.name.length <= 80
      && DEPARTMENTS.includes(student.department)
      && typeof student.email === 'string' && /^[^\s@]+@[^\s@]+$/.test(student.email) && student.email.length <= 254;
  }

  function loadStudents() {
    let stored;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      warnStorage('Penyimpanan browser tidak tersedia. Perubahan hanya berlaku selama halaman ini terbuka.');
      return exampleStudents();
    }
    if (stored === null) return exampleStudents();
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.every(validStoredStudent)
        || new Set(parsed.map(student => student.id)).size !== parsed.length
        || new Set(parsed.map(student => student.nim)).size !== parsed.length) {
        throw new Error('Invalid saved data');
      }
      return parsed.map(({ id, nim, name, department, email }) => ({ id, nim, name, department, email }));
    } catch {
      warnStorage('Data tersimpan tidak dapat dibaca. Data contoh ditampilkan agar aplikasi tetap bisa digunakan.');
      return exampleStudents();
    }
  }

  let students = loadStudents();

  function persistStudents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
      storageWarning.hidden = true;
    } catch {
      warnStorage('Perubahan belum tersimpan di browser. Data tetap bisa dikelola selama halaman ini terbuka.');
    }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function makeIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('icon');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#icon-' + name);
    svg.append(use);
    return svg;
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toLocaleUpperCase('id-ID');
  }

  function filteredStudents() {
    const query = search.value.trim().toLocaleLowerCase('id-ID');
    return students.filter(student => {
      const matchesQuery = [student.nim, student.name, student.department, student.email]
        .some(value => value.toLocaleLowerCase('id-ID').includes(query));
      return matchesQuery && (!departmentFilter.value || student.department === departmentFilter.value);
    });
  }

  function makeRow(student, number) {
    const row = document.createElement('tr');
    if (student.id === editingId) row.classList.add('editing-row');
    row.append(makeElement('td', 'row-number', number), makeElement('td', 'nim-cell', student.nim));

    const nameCell = document.createElement('td');
    const nameWrap = makeElement('div', 'student-name');
    const avatar = makeElement('span', 'student-avatar', initials(student.name));
    avatar.setAttribute('aria-hidden', 'true');
    nameWrap.append(avatar, makeElement('span', '', student.name));
    nameCell.append(nameWrap);
    row.append(nameCell);

    const departmentCell = document.createElement('td');
    departmentCell.append(makeElement('span', 'department-badge department-' + student.department.toLowerCase().replaceAll(' ', '-'), student.department));
    row.append(departmentCell);

    const emailCell = document.createElement('td');
    const emailLink = makeElement('a', 'email-link', student.email);
    emailLink.href = 'mailto:' + student.email;
    emailCell.append(emailLink);
    row.append(emailCell);

    const actionCell = document.createElement('td');
    const actions = makeElement('div', 'row-actions');
    for (const action of ['edit', 'delete']) {
      const button = makeElement('button', 'icon-button ' + action + '-button');
      button.type = 'button';
      button.dataset.action = action;
      button.dataset.id = student.id;
      const label = (action === 'edit' ? 'Edit data ' : 'Hapus data ') + student.name;
      button.setAttribute('aria-label', label);
      button.title = label;
      button.append(makeIcon(action === 'edit' ? 'edit' : 'trash'));
      actions.append(button);
    }
    actionCell.append(actions);
    row.append(actionCell);
    return row;
  }

  function makeEmptyRow() {
    const hasStudents = students.length > 0;
    const row = document.createElement('tr');
    const cell = makeElement('td', 'empty-cell');
    cell.colSpan = 6;
    cell.append(makeIcon(hasStudents ? 'search' : 'users'));
    cell.append(makeElement('p', 'empty-title', hasStudents ? 'Mahasiswa tidak ditemukan' : 'Belum ada data mahasiswa'));
    cell.append(makeElement('p', 'empty-description', hasStudents
      ? 'Coba kata kunci lain atau tampilkan semua jurusan.'
      : 'Tambahkan mahasiswa pertama melalui form di samping.'));
    const button = makeElement('button', 'button button-secondary', hasStudents ? 'Hapus filter' : 'Tambah mahasiswa');
    button.type = 'button';
    button.addEventListener('click', hasStudents ? clearFilters : startNewStudent);
    cell.append(button);
    row.append(cell);
    return row;
  }

  function makePageButton(label, targetPage, disabled, icon) {
    const button = makeElement('button', '', icon ? undefined : String(targetPage));
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    if (icon) button.append(makeIcon(icon));
    if (!icon && targetPage === currentPage) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => {
      currentPage = targetPage;
      render();
      pagination.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
    });
    return button;
  }

  function renderPagination(total) {
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const first = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(currentPage * PAGE_SIZE, total);
    document.querySelector('#pagination-info').textContent = `Menampilkan ${first} - ${last} dari ${total} data`;
    pagination.replaceChildren(makePageButton('Halaman sebelumnya', currentPage - 1, currentPage === 1, 'left'));
    const start = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
    const end = Math.min(pageCount, start + 4);
    if (start > 1) {
      pagination.append(makePageButton('Halaman 1', 1, false));
      if (start > 2) pagination.append(makeElement('span', 'pagination-ellipsis', '...'));
    }
    for (let number = start; number <= end; number++) {
      pagination.append(makePageButton('Halaman ' + number, number, total === 0));
    }
    if (end < pageCount) {
      if (end < pageCount - 1) pagination.append(makeElement('span', 'pagination-ellipsis', '...'));
      pagination.append(makePageButton('Halaman ' + pageCount, pageCount, false));
    }
    pagination.append(makePageButton('Halaman berikutnya', currentPage + 1, currentPage === pageCount, 'right'));
  }

  function render() {
    const results = filteredStudents();
    currentPage = Math.max(1, Math.min(currentPage, Math.max(1, Math.ceil(results.length / PAGE_SIZE))));
    const start = (currentPage - 1) * PAGE_SIZE;
    const visible = results.slice(start, start + PAGE_SIZE);
    rows.replaceChildren(...(visible.length ? visible.map((student, index) => makeRow(student, start + index + 1)) : [makeEmptyRow()]));
    document.querySelector('#total-students').textContent = students.length;
    document.querySelector('#total-programs').textContent = new Set(students.map(student => student.department)).size;
    document.querySelector('#total-results').textContent = results.length;
    document.querySelector('#student-count').textContent = results.length;
    document.querySelector('#results-description').textContent = search.value.trim() || departmentFilter.value ? 'Sesuai pencarian dan filter' : 'Tanpa filter aktif';
    renderPagination(results.length);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    document.querySelector('#toast-message').textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  }

  function focusForm() {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    formPanel.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' });
    fields.nim.focus({ preventScroll: true });
  }

  function updateFormMode() {
    const editing = editingId !== null;
    document.querySelector('#form-title').textContent = editing ? 'Edit mahasiswa' : 'Form mahasiswa';
    document.querySelector('#form-description').textContent = editing ? 'Perbarui data mahasiswa yang dipilih.' : 'Lengkapi data mahasiswa baru.';
    document.querySelector('#save-label').textContent = editing ? 'Simpan perubahan' : 'Simpan mahasiswa';
    document.querySelector('#edit-badge').hidden = !editing;
    formPanel.classList.toggle('is-editing', editing);
  }

  function resetForm(keepEditing = false) {
    form.reset();
    Object.values(fields).forEach(field => field.setCustomValidity(''));
    if (!keepEditing) editingId = null;
    updateFormMode();
  }

  function clearFilters() {
    search.value = '';
    departmentFilter.value = '';
    currentPage = 1;
    render();
  }

  function startNewStudent() {
    resetForm();
    render();
    focusForm();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    Object.values(fields).forEach(field => field.setCustomValidity(''));
    const data = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value.trim()]));
    if (data.name.length < 2) fields.name.setCustomValidity('Nama harus berisi minimal 2 karakter selain spasi.');
    if (students.some(student => student.nim === data.nim && student.id !== editingId)) {
      fields.nim.setCustomValidity('NIM sudah digunakan. Masukkan NIM lain yang unik.');
    }
    if (!form.reportValidity()) return;

    const wasEditing = editingId !== null;
    const id = editingId || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : 'student-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    const student = { id, ...data };
    if (wasEditing) students = students.map(item => item.id === id ? student : item);
    else students.unshift(student);
    persistStudents();
    search.value = '';
    departmentFilter.value = '';
    currentPage = Math.floor(students.findIndex(item => item.id === id) / PAGE_SIZE) + 1;
    resetForm();
    render();
    showToast(wasEditing ? 'Data mahasiswa berhasil diperbarui.' : 'Mahasiswa berhasil ditambahkan.');
  });

  Object.values(fields).forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));
  document.querySelector('#add-student-button').addEventListener('click', startNewStudent);
  document.querySelector('#cancel-button').addEventListener('click', () => {
    resetForm();
    render();
    showToast('Pengisian form dibatalkan.');
  });
  document.querySelector('#reset-button').addEventListener('click', () => {
    resetForm(true);
    fields.nim.focus();
    showToast('Kolom form dikosongkan.');
  });

  rows.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const student = students.find(item => item.id === button.dataset.id);
    if (!student) return;
    if (button.dataset.action === 'edit') {
      editingId = student.id;
      Object.entries(fields).forEach(([key, field]) => {
        field.value = student[key];
        field.setCustomValidity('');
      });
      updateFormMode();
      render();
      focusForm();
    } else {
      pendingDeleteId = student.id;
      deleteReturnFocus = button;
      document.querySelector('#delete-description').textContent = `Data ${student.name} (${student.nim}) akan dihapus dari daftar di browser ini.`;
      deleteDialog.showModal();
    }
  });

  document.querySelector('#delete-confirm').addEventListener('click', () => {
    if (!pendingDeleteId) return;
    students = students.filter(student => student.id !== pendingDeleteId);
    if (editingId === pendingDeleteId) resetForm();
    persistStudents();
    render();
    deleteDialog.close();
    showToast('Data mahasiswa berhasil dihapus.');
  });
  document.querySelector('#delete-cancel').addEventListener('click', () => deleteDialog.close());
  deleteDialog.addEventListener('close', () => {
    pendingDeleteId = null;
    if (deleteReturnFocus?.isConnected) deleteReturnFocus.focus();
    else search.focus({ preventScroll: true });
    deleteReturnFocus = null;
  });

  function searchChanged() { currentPage = 1; render(); }
  search.addEventListener('input', searchChanged);
  departmentFilter.addEventListener('change', searchChanged);
  document.querySelector('#search-form').addEventListener('submit', event => { event.preventDefault(); searchChanged(); });
  document.querySelector('#about-button').addEventListener('click', () => aboutDialog.showModal());
  document.querySelector('#about-close').addEventListener('click', () => aboutDialog.close());
  for (const dialog of [deleteDialog, aboutDialog]) {
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
  }

  function updateNavigation() {
    const active = location.hash === '#overview' ? 'overview' : 'students';
    document.querySelectorAll('[data-nav]').forEach(link => {
      link.classList.toggle('active', link.dataset.nav === active);
      if (link.dataset.nav === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', updateNavigation);
  updateNavigation();
  render();
})();
