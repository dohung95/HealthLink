/**
 * Audio Service - Quản lý âm thanh thông báo
 * Supports: notification sounds, ringtones, message alerts
 */

// Import audio files từ assets
import ringBellSound from '../assets/audio/ring bel.mp3';
import acceptPhoneSound from '../assets/audio/accept phone.m4a';

class AudioService {
    constructor() {
        // Khởi tạo các audio instances
        this.sounds = {
            notification: null,
            ring: null,
            message: null,
            accept: null
        };

        // Trạng thái
        this.isRinging = false;
        this.volume = 0.5; // Default volume (0.0 - 1.0)
    }

    /**
     * Khởi tạo các file âm thanh
     */
    initSounds() {
        try {
            // Notification sound (dùng cho thông báo chung)
            this.sounds.notification = new Audio('/notification.mp3');
            this.sounds.notification.volume = this.volume;

            // Ring sound (dùng cho cuộc gọi đến) - sử dụng file từ assets
            this.sounds.ring = new Audio(ringBellSound);
            this.sounds.ring.volume = this.volume;
            this.sounds.ring.loop = true; // Lặp lại cho đến khi dừng

            // Message sound (dùng cho tin nhắn mới)
            this.sounds.message = new Audio('/notification.mp3');
            this.sounds.message.volume = this.volume * 0.7; // Volume thấp hơn cho tin nhắn

            // Accept sound (dùng khi bắt máy)
            this.sounds.accept = new Audio(acceptPhoneSound);
            this.sounds.accept.volume = this.volume;

            console.log('✓ Audio service initialized');
        } catch (error) {
            console.error('Error initializing audio service:', error);
        }
    }

    /**
     * Phát âm thanh thông báo
     */
    playNotification() {
        try {
            if (!this.sounds.notification) {
                this.initSounds();
            }

            // Reset và phát
            this.sounds.notification.currentTime = 0;
            this.sounds.notification.play().catch(e => {
                console.log('Could not play notification sound:', e);
            });
        } catch (error) {
            console.log('Notification sound error:', error);
        }
    }

    /**
     * Phát âm thanh chuông (cho cuộc gọi đến)
     */
    playRingtone() {
        try {
            if (this.isRinging) {
                return; // Đang reng rồi, không phát lại
            }

            if (!this.sounds.ring) {
                this.initSounds();
            }

            this.isRinging = true;
            this.sounds.ring.currentTime = 0;
            this.sounds.ring.play().catch(e => {
                console.log('Could not play ringtone:', e);
                this.isRinging = false;
            });
        } catch (error) {
            console.log('Ringtone error:', error);
            this.isRinging = false;
        }
    }

    /**
     * Dừng âm thanh chuông
     */
    stopRingtone() {
        try {
            if (this.sounds.ring && this.isRinging) {
                this.sounds.ring.pause();
                this.sounds.ring.currentTime = 0;
                this.isRinging = false;
            }
        } catch (error) {
            console.log('Error stopping ringtone:', error);
        }
    }

    /**
     * Phát âm thanh tin nhắn mới
     */
    playMessageSound() {
        try {
            if (!this.sounds.message) {
                this.initSounds();
            }

            this.sounds.message.currentTime = 0;
            this.sounds.message.play().catch(e => {
                console.log('Could not play message sound:', e);
            });
        } catch (error) {
            console.log('Message sound error:', error);
        }
    }

    /**
     * Phát âm thanh khi bắt máy
     */
    playAcceptSound() {
        try {
            if (!this.sounds.accept) {
                this.initSounds();
            }

            this.sounds.accept.currentTime = 0;
            this.sounds.accept.play().catch(e => {
                console.log('Could not play accept sound:', e);
            });
        } catch (error) {
            console.log('Accept sound error:', error);
        }
    }

    /**
     * Thiết lập âm lượng (0.0 - 1.0)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));

        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.volume = this.volume;
            }
        });
    }

    /**
     * Tắt toàn bộ âm thanh
     */
    stopAll() {
        this.stopRingtone();

        Object.values(this.sounds).forEach(sound => {
            if (sound) {
                sound.pause();
                sound.currentTime = 0;
            }
        });
    }
}

// Export singleton instance
export const audioService = new AudioService();
export default audioService;
