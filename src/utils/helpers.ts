/** Formats a number into a compact string (e.g., 1200 -> 1K, 1500000 -> 1.5M). */
export const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
    return num.toString();
};

/** Formats seconds into a MM:SS string. */
export const formatTime = (time: number): string => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/** Shows a notification message at the top of the screen. */
export const showNotification = (message: string) => {
    const notification = document.getElementById('notification') as HTMLElement;
    let notificationTimeout: number;

    if (notificationTimeout) clearTimeout(notificationTimeout);
    notification.textContent = message;
    notification.classList.remove('hidden', 'opacity-0', '-translate-y-full');
    notification.classList.add('opacity-100', 'translate-y-0');

    notificationTimeout = window.setTimeout(() => {
        notification.classList.remove('opacity-100', 'translate-y-0');
        notification.classList.add('opacity-0', '-translate-y-full');
        setTimeout(() => notification.classList.add('hidden'), 300);
    }, 3000);
};