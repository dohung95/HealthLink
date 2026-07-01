import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getPharmacyAnnouncementCopy,
  getPharmacyIdleAnnouncement,
  getPharmacyNotificationTarget,
  isPharmacyAnnouncementType,
} from './workflow/pharmacyWorkflow';

const SWAP_MS = 520;
const TARGET_SETTLE_MS = 3000;
const IDLE_ROTATE_MS = 30000;

function getAnnouncementKey(notification) {
  if (!notification) return null;
  return notification.notificationId
    || notification.notificationID
    || `${notification.type}-${notification.relatedId || ''}-${notification.createdAt || notification.timestamp || ''}`;
}

function isCurrentLocationTarget(location, target) {
  if (!target) return false;
  const [targetPathname, targetSearch = ''] = target.split('?');
  if (location.pathname !== targetPathname) return false;
  if (!targetSearch) return true;

  const requiredParams = new URLSearchParams(targetSearch);
  const currentParams = new URLSearchParams(location.search);

  return Array.from(requiredParams.entries()).every(
    ([key, value]) => currentParams.get(key) === value,
  );
}

export default function PharmacyAnnouncementBar({ notification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('idle');
  const [displayedAlert, setDisplayedAlert] = useState(null);
  const [idleIndex, setIdleIndex] = useState(0);
  const [isLeaving, setIsLeaving] = useState(false);
  const settledKeysRef = useRef(new Set());
  const swapTimerRef = useRef(null);
  const settleTimerRef = useRef(null);
  const idleIntervalRef = useRef(null);
  const idleSwapTimerRef = useRef(null);

  useEffect(() => () => {
    window.clearTimeout(swapTimerRef.current);
    window.clearTimeout(settleTimerRef.current);
    window.clearInterval(idleIntervalRef.current);
    window.clearTimeout(idleSwapTimerRef.current);
  }, []);

  useEffect(() => {
    if (!isPharmacyAnnouncementType(notification?.type)) return undefined;

    const nextKey = getAnnouncementKey(notification);
    if (!nextKey || settledKeysRef.current.has(nextKey)) return undefined;
    if (mode === 'alert' && getAnnouncementKey(displayedAlert) === nextKey) return undefined;

    window.clearTimeout(swapTimerRef.current);
    setIsLeaving(true);

    const delay = mode === 'alert' || displayedAlert ? SWAP_MS : 0;
    swapTimerRef.current = window.setTimeout(() => {
      setDisplayedAlert(notification);
      setMode('alert');
      setIsLeaving(false);
    }, delay);

    return () => window.clearTimeout(swapTimerRef.current);
  }, [displayedAlert, mode, notification]);

  useEffect(() => {
    if (mode !== 'alert' || !displayedAlert) return undefined;

    const target = getPharmacyNotificationTarget(displayedAlert);
    if (!isCurrentLocationTarget(location, target)) return undefined;

    window.clearTimeout(settleTimerRef.current);
    settleTimerRef.current = window.setTimeout(() => {
      const key = getAnnouncementKey(displayedAlert);
      if (key) settledKeysRef.current.add(key);

      setIsLeaving(true);
      window.clearTimeout(swapTimerRef.current);
      swapTimerRef.current = window.setTimeout(() => {
        setDisplayedAlert(null);
        setMode('idle');
        setIsLeaving(false);
      }, SWAP_MS);
    }, TARGET_SETTLE_MS);

    return () => window.clearTimeout(settleTimerRef.current);
  }, [displayedAlert, location, mode]);

  useEffect(() => {
    if (mode !== 'idle') return undefined;

    idleIntervalRef.current = window.setInterval(() => {
      setIsLeaving(true);
      window.clearTimeout(idleSwapTimerRef.current);
      idleSwapTimerRef.current = window.setTimeout(() => {
        setIdleIndex((value) => value + 1);
        setIsLeaving(false);
      }, SWAP_MS);
    }, IDLE_ROTATE_MS);

    return () => {
      window.clearInterval(idleIntervalRef.current);
      window.clearTimeout(idleSwapTimerRef.current);
    };
  }, [mode]);

  const alertCopy = useMemo(() => {
    if (!displayedAlert) return null;
    return {
      ...getPharmacyAnnouncementCopy(displayedAlert),
      icon: 'notifications_active',
      target: getPharmacyNotificationTarget(displayedAlert),
    };
  }, [displayedAlert]);

  const idleCopy = useMemo(() => getPharmacyIdleAnnouncement(idleIndex), [idleIndex]);
  const currentCopy = mode === 'alert' && alertCopy ? alertCopy : idleCopy;
  const isLong = currentCopy.text.length > 44;

  return (
    <button
      className={[
        'pharmacy-announcement-bar',
        mode === 'alert' ? 'is-alert' : 'is-idle',
        isLeaving ? 'is-leaving' : 'is-visible',
        isLong ? 'is-long' : '',
      ].filter(Boolean).join(' ')}
      disabled={!currentCopy.target}
      onClick={() => {
        if (currentCopy.target) navigate(currentCopy.target);
      }}
      type="button"
    >
      <span className="material-symbols-outlined pharmacy-announcement-bar__icon">
        {currentCopy.icon}
      </span>
      <span className="pharmacy-announcement-bar__viewport">
        <span className="pharmacy-announcement-bar__text">
          {currentCopy.text}
        </span>
      </span>
    </button>
  );
}
