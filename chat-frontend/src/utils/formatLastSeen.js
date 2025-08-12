export default function formatLastSeen(ts) {
    const then = new Date(ts);
    const diff = (Date.now() - then) / 60000; // minutes
    if (diff < 1) return "just now";
    if (diff < 60) return `${Math.floor(diff)} min ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h} hr ago`;
    return then.toLocaleDateString();
}
