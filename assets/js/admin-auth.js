
(function () {
    const ADMIN_UID = '08b908c4-669e-413c-8c89-9e394a47b9e9';

    const supabase = window.rafveSupabase;
    const loginSection = document.querySelector('#admin-login');
    const loginForm = document.querySelector('#admin-login-form');
    const loginMessage = document.querySelector('#login-message');
    const dashboard = document.querySelector('#admin-dashboard');

    let dashboardLoaded = false;
    let loginInProgress = false;

    function showLogin(message = '') {
        if (loginSection) loginSection.classList.remove('hidden');
        if (dashboard) dashboard.classList.add('hidden');
        if (loginMessage) loginMessage.textContent = message;
    }

    function showDashboard() {
        if (loginSection) loginSection.classList.add('hidden');
        if (dashboard) dashboard.classList.remove('hidden');
    }

    function addLogoutButton() {
        const header = document.querySelector('.admin-top');
        if (!header || document.querySelector('#admin-logout')) return;

        const button = document.createElement('button');
        button.id = 'admin-logout';
        button.type = 'button';
        button.className = 'btn';
        button.textContent = 'Logout';

        button.addEventListener('click', async () => {
            button.disabled = true;

            const { error } = await supabase.auth.signOut();

            if (error) {
                button.disabled = false;
                alert('Gagal logout. Silakan coba lagi.');
                console.error(error);
                return;
            }

            window.location.reload();
        });

        header.appendChild(button);
    }

    function loadDashboard() {
        if (dashboardLoaded) return;

        dashboardLoaded = true;
        showDashboard();
        addLogoutButton();

        const script = document.createElement('script');
        script.src = 'assets/js/admin.js';

        script.onerror = () => {
            dashboardLoaded = false;
            showLogin('Dashboard gagal dimuat. Periksa file admin.js.');
        };

        document.body.appendChild(script);
    }

    async function verifyAdmin() {
        const { data, error } = await supabase.auth.getUser();

        if (error || !data.user) {
            showLogin();
            return;
        }

        if (data.user.id !== ADMIN_UID) {
            await supabase.auth.signOut();
            showLogin('Akun ini tidak memiliki akses admin RAFVE.');
            return;
        }

        loadDashboard();
    }

    if (!supabase) {
        showLogin('Koneksi Supabase belum siap. Periksa supabase-client.js.');
        return;
    }

    if (!loginForm) {
        console.error('Form login admin tidak ditemukan.');
        return;
    }

    showLogin();

    loginForm.addEventListener('submit', async event => {
        event.preventDefault();

        if (loginInProgress) return;
        loginInProgress = true;

        const submitButton = loginForm.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) submitButton.disabled = true;
        if (loginMessage) loginMessage.textContent = 'Memeriksa login...';

        const email = loginForm.elements.email.value.trim();
        const password = loginForm.elements.password.value;

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) {
                showLogin('Login gagal. Periksa email dan password.');
                console.error(error);
                return;
            }

            await verifyAdmin();
        } catch (error) {
            console.error(error);
            showLogin('Terjadi kesalahan koneksi. Silakan coba lagi.');
        } finally {
            loginInProgress = false;
            if (submitButton) submitButton.disabled = false;
        }
    });

    verifyAdmin();
})();
