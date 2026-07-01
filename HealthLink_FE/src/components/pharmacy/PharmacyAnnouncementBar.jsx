import { useState, useEffect, useRef } from 'react';

const DEFAULT_ANNOUNCEMENTS = [
  { id: 1, text: 'Taxonomy categories now available in inventory filter sidebar.', icon: 'new_releases' },
  { id: 2, text: 'Import CSV to quickly add or update inventory items in bulk.', icon: 'upload_file' },
];

export default function PharmacyAnnouncementBar({ announcements }) {
  const items = announcements?.length ? announcements : DEFAULT_ANNOUNCEMENTS;
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setLeaving(true);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % items.length);
        setLeaving(false);
      }, 300);
    }, 5000);
    return () => clearInterval(timerRef.current);
  }, [items.length]);

  if (!items.length) return null;

  const current = items[index];
  return (
    <div className="pharmacy-announcement-bar">
      <span className={`pharmacy-announcement-bar__slide ${leaving ? 'is-leaving' : 'is-enter'}`} key={current.id}>
        <span className="material-symbols-outlined pharmacy-announcement-bar__icon">{current.icon || 'campaign'}</span>
        <span className="pharmacy-announcement-bar__text">{current.text}</span>
      </span>
    </div>
  );
}
