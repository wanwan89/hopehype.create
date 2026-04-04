function toast(title, message, type = 'warning') {
    // 1. Cari atau buat container #toast sesuai CSS kamu
    let container = document.getElementById('toast');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast';
        document.body.appendChild(container);
    }

    // 2. Buat elemen card
    const card = document.createElement('div');
    card.className = `toast-card`;

    // 3. Tentukan icon berdasarkan type (success, warning, error, info)
    let iconSymbol = '!';
    if (type === 'success') iconSymbol = '✓';
    if (type === 'error') iconSymbol = '✕';
    if (type === 'info') iconSymbol = 'i';

    // 4. Struktur HTML sesuai class CSS kamu
    card.innerHTML = `
        <div class="toast-icon-wrap ${type}">
            <span class="toast-icon">${iconSymbol}</span>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-subtitle">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.classList.remove('show'); setTimeout(()=>this.parentElement.remove(), 300);">&times;</button>
    `;

    container.appendChild(card);

    // 5. Jalankan animasi show
    setTimeout(() => card.classList.add('show'), 10);

    // 6. Hapus otomatis setelah 4 detik
    setTimeout(() => {
        card.classList.remove('show');
        setTimeout(() => card.remove(), 300);
    }, 4000);
}

// Global access
window.toast = toast;
