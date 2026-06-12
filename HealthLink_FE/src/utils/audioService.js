/**
 * Audio Service — Quản lý âm thanh thông báo và cuộc gọi.
 * 
 * Hỗ trợ: notification sounds, ringtones, message alerts, accept sounds.
 * 
 * Issue #4 fix: Giải quyết race condition giữa play() Promise và pause()
 * bằng cách lưu play Promise và chỉ pause sau khi Promise resolve.
 */

import ringBellSound from '../assets/audio/ring bel.mp3';
import acceptPhoneSound from '../assets/audio/accept phone.m4a';

class AudioService {
    constructor() {
        this.sounds = {
            notification: null,
            ring: null,
            message: null,
            accept: null
        };

        this.isRinging = false;
        this.volume = 0.5; // 0.0 – 1.0
        // Lưu play() Promise để tránh race condition pause/play
        this._ringPlayPromise = null;
        this._stopRequested = false;
    }

    /**
     * Khởi tạo các file âm thanh (lazy init).
     */
    initSounds() {
        try {
            this.sounds.notification = new Audio('/notification.mp3');
            this.sounds.notification.volume = this.volume;

            this.sounds.ring = new Audio(ringBellSound);
            this.sounds.ring.volume = this.volume;
            this.sounds.ring.loop = true;

            this.sounds.message = new Audio('/notification.mp3');
            this.sounds.message.volume = this.volume * 0.7;

            this.sounds.accept = new Audio(acceptPhoneSound);
            this.sounds.accept.volume = this.volume;

            console.log('[AudioService] Initialized successfully.');
        } catch (error) {
            console.error('[AudioService] Init error:', error);
        }
    }

    /**
     * Phát âm thanh thông báo chung.
     */
    playNotification() {
        try {
            if (!this.sounds.notification) this.initSounds();
            this.sounds.notification.currentTime = 0;
            this.sounds.notification.play().catch((e) => {
                console.log('[AudioService] Cannot play notification:', e);
            });
        } catch (error) {
            console.log('[AudioService] Notification error:', error);
        }
    }

    /**
     * Phát chuông cuộc gọi đến (lặp lại).
     * Issue #4: Lưu play Promise để stopRingtone có thể cancel đúng cách.
     */
    playRingtone() {
        try {
            if (this.isRinging) return; // Đang reng, không phát lại

            if (!this.sounds.ring) this.initSounds();

            this.isRinging = true;
            this._stopRequested = false;
            this.sounds.ring.currentTime = 0;

            this._ringPlayPromise = this.sounds.ring.play();

            if (this._ringPlayPromise !== undefined) {
                this._ringPlayPromise
                    .then(() => {
                        // Nếu stopRingtone() đã được gọi trong khi play() chưa resolve
                        if (this._stopRequested) {
                            this._pauseRing();
                        }
                    })
                    .catch((e) => {
                        console.log('[AudioService] Cannot play ringtone:', e);
                        this.isRinging = false;
                    });
            }
        } catch (error) {
            console.log('[AudioService] Ringtone error:', error);
            this.isRinging = false;
        }
    }

    /**
     * Dừng chuông cuộc gọi — xử lý đúng race condition play/pause.
     * Issue #4: Set _stopRequested trước, pause sau khi Promise resolve nếu cần.
     */
    stopRingtone() {
        try {
            if (!this.isRinging) return;

            this._stopRequested = true;
            this.isRinging = false;

            if (this._ringPlayPromise !== undefined) {
                // Đợi play() resolve rồi mới pause để tránh DOMException
                this._ringPlayPromise
                    .then(() => {
                        this._pauseRing();
                    })
                    .catch(() => {
                        // Play đã fail, không cần pause
                    });
            } else {
                this._pauseRing();
            }
        } catch (error) {
            console.log('[AudioService] Stop ringtone error:', error);
        }
    }

    /**
     * Force dừng chuông ngay lập tức (dùng khi cần stop ngay, ví dụ unmount).
     */
    forceStopRingtone() {
        try {
            this._stopRequested = true;
            this.isRinging = false;
            this._ringPlayPromise = null;
            if (this.sounds.ring) {
                this.sounds.ring.pause();
                this.sounds.ring.currentTime = 0;
                // Tạo lại audio element để reset hoàn toàn
                const src = this.sounds.ring.src;
                this.sounds.ring = new Audio(src);
                this.sounds.ring.volume = this.volume;
                this.sounds.ring.loop = true;
            }
        } catch (error) {
            console.log('[AudioService] Force stop error:', error);
        }
    }

    /**
     * Internal: thực sự pause audio ring.
     * @private
     */
    _pauseRing() {
        try {
            if (this.sounds.ring) {
                this.sounds.ring.pause();
                this.sounds.ring.currentTime = 0;
            }
        } catch (e) {
            console.log('[AudioService] Pause ring error:', e);
        }
    }

    /**
     * Phát âm thanh khi chấp nhận cuộc gọi.
     */
    playAcceptSound() {
        try {
            if (!this.sounds.accept) this.initSounds();
            this.sounds.accept.currentTime = 0;
            this.sounds.accept.play().catch((e) => {
                console.log('[AudioService] Cannot play accept sound:', e);
            });
        } catch (error) {
            console.log('[AudioService] Accept sound error:', error);
        }
    }

    /**
     * Phát âm thanh tin nhắn mới.
     */
    playMessageSound() {
        try {
            if (!this.sounds.message) this.initSounds();
            this.sounds.message.currentTime = 0;
            this.sounds.message.play().catch((e) => {
                console.log('[AudioService] Cannot play message sound:', e);
            });
        } catch (error) {
            console.log('[AudioService] Message sound error:', error);
        }
    }

    /**
     * Thiết lập âm lượng cho tất cả sounds (0.0 – 1.0).
     * @param {number} volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach((sound) => {
            if (sound) sound.volume = this.volume;
        });
    }

    /**
     * Dừng tất cả âm thanh.
     */
    stopAll() {
        this.forceStopRingtone();
        Object.values(this.sounds).forEach((sound) => {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
    }
}

// Singleton — dùng chung toàn app
export const audioService = new AudioService();
export default audioService;
