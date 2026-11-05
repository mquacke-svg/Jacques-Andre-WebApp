// Installation never changes the server's authentication or order flow.
if ('serviceWorker' in navigator && window.isSecureContext) {
    navigator.serviceWorker.register('/app/sw.js', { scope: '/app/', updateViaCache: 'none' }).catch(() => {
        // The shop remains fully usable when installation is unavailable.
    });
}
let installPrompt;
const installButton = document.querySelector('[data-install-app]');
window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
    if (!installPrompt) return;
    const pending = installPrompt;
    installPrompt = undefined;
    installButton.hidden = true;
    try {
        await pending.prompt();
        await pending.userChoice;
    } catch {
        // The native browser menu remains available.
    }
});
window.addEventListener('appinstalled', () => {
    installPrompt = undefined;
    if (installButton) installButton.hidden = true;
});
