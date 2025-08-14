// public/js/main.js
document.addEventListener('DOMContentLoaded', function () {
    console.log('Express Template initialized');

    // Initialize all components
    initPasswordValidation();
    initThemeHandler();
    initFormValidation();
    initTooltips();

    // Add active class to current page nav link
    highlightActiveNavLink();
});

// Password validation for registration and profile forms
function initPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm_password');
    const newPasswordInput = document.getElementById('new_password');

    if (passwordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function () {
            const password = passwordInput.value;
            const confirmPassword = this.value;

            if (password !== confirmPassword) {
                this.setCustomValidity('Passwords do not match');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    if (newPasswordInput && confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function () {
            const newPassword = newPasswordInput.value;
            const confirmPassword = this.value;

            if (newPassword && newPassword !== confirmPassword) {
                this.setCustomValidity('Passwords do not match');
            } else {
                this.setCustomValidity('');
            }
        });
    }
}

// Theme handling
function initThemeHandler() {
    const themeSelect = document.getElementById('theme');

    if (themeSelect) {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'auto';
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);

        themeSelect.addEventListener('change', function () {
            const theme = this.value;
            localStorage.setItem('theme', theme);
            applyTheme(theme);
        });
    }
}

function applyTheme(theme) {
    const html = document.documentElement;

    if (theme === 'dark') {
        html.classList.add('dark-theme');
    } else if (theme === 'light') {
        html.classList.remove('dark-theme');
    } else {
        // Auto theme - use system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            html.classList.add('dark-theme');
        } else {
            html.classList.remove('dark-theme');
        }
    }
}

// Form validation enhancement
function initFormValidation() {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
        form.addEventListener('submit', function (e) {
            const submitButton = form.querySelector('button[type="submit"]');

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<div class="spinner"></div>Processing...';

                // Re-enable button after 5 seconds as failsafe
                setTimeout(() => {
                    submitButton.disabled = false;
                    submitButton.innerHTML = submitButton.getAttribute('data-original-text') || 'Submit';
                }, 5000);
            }
        });

        // Store original button text
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.setAttribute('data-original-text', submitButton.innerHTML);
        }
    });
}

// Tooltip functionality
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');

    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const tooltipText = e.target.getAttribute('data-tooltip');
    if (!tooltipText) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = tooltipText;
    tooltip.id = 'active-tooltip';

    document.body.appendChild(tooltip);

    const rect = e.target.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
}

function hideTooltip() {
    const tooltip = document.getElementById('active-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// Highlight active navigation link
function highlightActiveNavLink() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// Admin panel functions
function editUser(userId) {
    // This would typically open a modal or redirect to edit page
    const newAccountType = prompt('Enter new account type (admin/user):');

    if (newAccountType && (newAccountType === 'admin' || newAccountType === 'user')) {
        // Send AJAX request to update user
        fetch(`/admin/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                account_type: newAccountType
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showAlert('User updated successfully!', 'success');
                    location.reload();
                } else {
                    showAlert('Failed to update user: ' + data.error, 'error');
                }
            })
            .catch(error => {
                showAlert('Network error: ' + error.message, 'error');
            });
    }
}

function deleteUser(userId, username) {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
        fetch(`/admin/users/${userId}`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showAlert('User deleted successfully!', 'success');
                    location.reload();
                } else {
                    showAlert('Failed to delete user: ' + data.error, 'error');
                }
            })
            .catch(error => {
                showAlert('Network error: ' + error.message, 'error');
            });
    }
}

// Settings page functions
function saveSettings() {
    const theme = document.getElementById('theme').value;
    const notifications = document.getElementById('notifications').value;
    const language = document.getElementById('language').value;

    const settings = {
        theme,
        notifications,
        language
    };

    // Save to localStorage for demo purposes
    localStorage.setItem('userSettings', JSON.stringify(settings));

    showAlert('Settings saved successfully!', 'success');

    // Apply theme immediately
    applyTheme(theme);
}

function exportData() {
    showAlert('Data export feature would be implemented here', 'info');
}

function confirmDeleteAccount() {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:');

    if (confirmation === 'DELETE') {
        showAlert('Account deletion would be processed here', 'warning');
    } else {
        showAlert('Account deletion cancelled', 'info');
    }
}

// Utility functions
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert-dynamic');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dynamic`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '1000';
    alert.style.minWidth = '300px';
    alert.style.animation = 'slideInRight 0.3s ease';

    document.body.appendChild(alert);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 300);
        }
    }, 5000);

    // Allow manual dismissal
    alert.addEventListener('click', () => {
        alert.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 300);
    });
}

// Add CSS animations for alerts
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .tooltip {
        position: absolute;
        background-color: var(--text-color);
        color: var(--surface-color);
        padding: 0.5rem;
        border-radius: var(--radius);
        font-size: 0.875rem;
        z-index: 1000;
        pointer-events: none;
        opacity: 0.9;
    }
    
    .dark-theme {
        --background-color: #0f172a;
        --surface-color: #1e293b;
        --text-color: #f1f5f9;
        --text-muted: #94a3b8;
        --border-color: #334155;
    }
`;
document.head.appendChild(style);