import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getRoomById, getOrCreateRoom, getRoomMessages, markAsRead } from '../../api/chatApi';
import { sendMessage as apiSendMessage, uploadMedia } from '../../api/chatApi';
import stompChatService from '../../services/stompChatService';
import { toast } from 'sonner';

const getFullUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `http://localhost:8096${url}`;
};

function ImageLightbox({ src, onClose }) {
  return (
    <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ zIndex: 99999, background: 'rgba(0,0,0,0.8)', cursor: 'zoom-out' }} onClick={onClose}>
      <img src={src} alt="full" style={{ maxWidth: '90%', maxHeight: '90%' }} />
    </div>
  );
}

function MiniAudioPlayer({ src, isOwn }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);
  const fmt = (t) => { if (isNaN(t) || !isFinite(t)) return '0:00'; return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`; };
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: isOwn ? '#0d6efd' : '#fff', padding: '10px 14px', borderRadius: '20px', minWidth: '200px', border: isOwn ? 'none' : '1px solid #dee2e6', color: isOwn ? '#fff' : '#212529' }}>
      <button onClick={() => { if (!audioRef.current || error) return; isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(() => setError(true)); }} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isOwn ? '#fff' : '#0d6efd', color: isOwn ? '#0d6efd' : '#fff', cursor: error ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
        <i className={`bi ${error ? 'bi-exclamation-circle' : isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 4, background: isOwn ? 'rgba(255,255,255,0.3)' : '#e9ecef', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: isOwn ? '#fff' : '#0d6efd', borderRadius: 2, transition: 'width 0.1s' }} />
        </div>
        <div style={{ fontSize: '0.75rem', marginTop: 2, opacity: 0.8 }}>{fmt(currentTime)} / {fmt(duration)}</div>
      </div>
      <audio ref={audioRef} src={src} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => { setIsPlaying(false); setCurrentTime(0); }} onError={() => setError(true)} style={{ display: 'none' }} />
    </div>
  );
}

export default function MiniChatBox({
  chatRoomId = null,
  partnerUserId = null,
  partnerName = 'User',
  appointmentId = null,
  isFullTab = false,
  readOnly = false,
  readOnlyMessage = 'This pharmacy conversation is read-only.',
  onClose,
}) {
  const { user: authUser, currentUserId, initiateCall, isInCall } = useAuth();
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [resolvedPartnerUserId, setResolvedPartnerUserId] = useState(partnerUserId);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const chatRef = useRef(null);
  const scrollTo = useRef(null);

  const isExpandedRef = useRef(isExpanded);
  useEffect(() => { isExpandedRef.current = isExpanded; }, [isExpanded]);

  const currentRoomRef = useRef(null);

  const initRoom = useCallback(async () => {
    if (!currentUserId || (!chatRoomId && !partnerUserId)) return;
    setLoading(true);
    try {
      const room = chatRoomId
        ? await getRoomById(chatRoomId)
        : await getOrCreateRoom(partnerUserId, appointmentId);
      const currentIsUser1 = String(room.user1Id) === String(currentUserId);
      const nextPartnerId = currentIsUser1 ? room.user2Id : room.user1Id;
      setResolvedPartnerUserId(nextPartnerId);
      setCurrentRoom(room);
      currentRoomRef.current = room;
      const msgs = await getRoomMessages(room.chatRoomId, 0, 50);
      setMessages(msgs);
      if (isExpandedRef.current) {
        await markAsRead(room.chatRoomId);
        window.dispatchEvent(new CustomEvent('chat-read-updated'));
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to connect to chat room');
    } finally {
      setLoading(false);
    }
  }, [appointmentId, chatRoomId, currentUserId, partnerUserId]);

  useEffect(() => { initRoom(); }, [initRoom]);

  useEffect(() => {
    if (isExpanded && currentRoomRef.current?.chatRoomId) {
      markAsRead(currentRoomRef.current.chatRoomId)
        .then(() => window.dispatchEvent(new CustomEvent('chat-read-updated')))
        .catch(() => {});
    }
  }, [isExpanded]);

  useEffect(() => {
    if (!authUser) return;

    const unsub = stompChatService.subscribeToChat((msg) => {
      const room = currentRoomRef.current;
      if (!room) return;

      if (msg.messageId === 'ROOM_CREATED') return;

      const isRoomActive = String(msg.chatRoomId) === String(room.chatRoomId);
      if (!isRoomActive) return;

      if (msg.content === '[SYSTEM_BLOCK_UPDATE]') {
        if (onClose) onClose();
        return;
      }
      if (msg.content === '[SYSTEM_CONSULTATION_STARTED]') return;

      setMessages(prev => {
        if (prev.some(m => m.messageId === msg.messageId)) return prev;
        if (String(msg.senderId) === String(currentUserId)) {
          const tempIndex = prev.findIndex(m => m.messageId?.startsWith('temp_') && m.content === msg.content);
          if (tempIndex !== -1) {
            const newArr = [...prev];
            newArr[tempIndex] = msg;
            return newArr;
          }
        }
        return [...prev, msg];
      });

      if (String(msg.senderId) !== String(currentUserId) && isExpandedRef.current) {
        markAsRead(room.chatRoomId)
          .then(() => window.dispatchEvent(new CustomEvent('chat-read-updated')))
          .catch(() => {});
      }
    });

    return () => { if (unsub) unsub(); };
  }, [authUser, currentUserId, onClose]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollTo.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isExpanded, scrollToBottom]);

  const handleMouseDown = (e) => {
    if (isFullTab) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const chatWidth = 350;
    const chatHeight = chatRef.current ? chatRef.current.offsetHeight : 500;
    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;
    newX = Math.max(newX, -(vw - 24 - chatWidth));
    newX = Math.min(newX, 24);
    newY = Math.max(newY, -(vh - 24 - chatHeight));
    newY = Math.min(newY, 24);
    setPosition({ x: newX, y: newY });
  }, [isDragging]);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  useEffect(() => {
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    else { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Đảm bảo chat box không bị lọt ra ngoài màn hình khi expand/collapse hoặc resize window
  useEffect(() => {
    if (isFullTab) return;
    
    const checkBounds = () => {
      if (!chatRef.current) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const chatWidth = 350;
      const chatHeight = chatRef.current.offsetHeight;
      
      setPosition(prev => {
        const minX = -(vw - 24 - chatWidth);
        const minY = -(vh - 24 - chatHeight);
        
        let newX = prev.x;
        let newY = prev.y;
        
        if (newX < minX) newX = minX;
        if (newX > 24) newX = 24;
        if (newY < minY) newY = minY;
        if (newY > 24) newY = 24;
        
        if (newX !== prev.x || newY !== prev.y) {
          return { x: newX, y: newY };
        }
        return prev;
      });
    };

    checkBounds();
    const timer = setTimeout(checkBounds, 250); // Đợi CSS transition height (0.2s) hoàn tất
    window.addEventListener('resize', checkBounds);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkBounds);
    };
  }, [isExpanded, isFullTab]);

  const sendMsg = async (e) => {
    e.preventDefault();
    if (readOnly) return;
    if (selectedFile) { await sendMedia(); return; }
    if (audioBlob) { await sendAudio(); return; }
    if (!formValue.trim() || !currentRoom || !resolvedPartnerUserId) return;
    const text = formValue.trim();
    setFormValue('');
    const optimistic = { messageId: `temp_${Date.now()}`, senderId: currentUserId, content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    try {
      const saved = await apiSendMessage({ chatRoomId: currentRoom.chatRoomId, receiverId: resolvedPartnerUserId, content: text });
      setMessages(prev => prev.map(m => m.messageId === optimistic.messageId ? saved : m));
      scrollToBottom();
    } catch {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
      setFormValue(text);
    }
  };

  const sendMedia = async () => {
    if (readOnly || !selectedFile || !currentRoom || !resolvedPartnerUserId) return;
    setUploading(true);
    try {
      const mime = selectedFile.type;
      let type = 'file';
      if (mime.startsWith('image/')) type = 'image';
      else if (mime.startsWith('video/')) type = 'video';
      const res = await uploadMedia(currentRoom.chatRoomId, type, selectedFile);
      const payload = { chatRoomId: currentRoom.chatRoomId, receiverId: resolvedPartnerUserId };
      if (type === 'image') payload.imageUrl = res.url;
      else if (type === 'video') payload.videoUrl = res.url;
      else payload.fileUrl = res.url;
      const saved = await apiSendMessage(payload);
      setMessages(prev => prev.some(m => m.messageId === saved.messageId) ? prev : [...prev, saved]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      scrollToBottom();
    } catch { toast.error('Failed to send file!'); }
    finally { setUploading(false); }
  };

  const startRecording = async () => {
    if (isRecording) return;
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'audio/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
      mediaRecorderRef.current = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (ev) => { if (ev.data.size > 0) audioChunksRef.current.push(ev.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => setRecordingDuration(p => p + 1), 1000);
    } catch { toast.error('Microphone access denied.'); }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const cancelRecording = () => {
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setAudioBlob(null);
      setIsRecording(false);
    } else if (audioBlob) { setAudioBlob(null); setRecordingDuration(0); }
  };

  const sendAudio = async () => {
    if (readOnly || !audioBlob || !currentRoom || !resolvedPartnerUserId) return;
    setUploading(true);
    try {
      const mime = audioBlob.type || 'audio/webm';
      const ext = mime.includes('wav') ? 'wav' : mime.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([audioBlob], `audio_${Date.now()}.${ext}`, { type: mime });
      const res = await uploadMedia(currentRoom.chatRoomId, 'audio', file);
      const saved = await apiSendMessage({ chatRoomId: currentRoom.chatRoomId, receiverId: resolvedPartnerUserId, audioUrl: res.url });
      setMessages(prev => prev.some(m => m.messageId === saved.messageId) ? prev : [...prev, saved]);
      setAudioBlob(null);
      setRecordingDuration(0);
      scrollToBottom();
    } catch { toast.error('Failed to send audio!'); }
    finally { setUploading(false); }
  };

  const handleVideoCall = () => {
    if (readOnly) return;
    if (!resolvedPartnerUserId) {
      toast.error('Chat room is still loading. Please try again in a moment.');
      return;
    }
    const room = currentRoomRef.current;
    if (!room?.chatRoomId) {
      toast.error('Chat room is still loading. Please try again in a moment.');
      return;
    }
    if (isInCall) {
      toast.warning('You are currently on another call. Please end it before making a new one.');
      return;
    }
    const callerName = authUser?.fullName || authUser?.preferred_username || authUser?.email || 'User';
    initiateCall(resolvedPartnerUserId, room.chatRoomId, partnerName, callerName);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
          e.preventDefault();
          setSelectedFile(file);
        }
        break;
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); e.target.value = ''; return; }
    setSelectedFile(file);
  };

  const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const renderCallHistory = (content, isOwn) => {
    try {
      const parts = content.substring('[CALL_HISTORY] '.length).split(' ');
      const d = {};
      parts.forEach(p => { const [k, v] = p.split(':'); if (k && v) d[k] = v; });
      const status = d.status || 'UNKNOWN';
      const sec = parseInt(d.duration) || 0;
      const missed = status === 'MISSED' || status === 'DECLINED';
      const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
      return (
        <div className="d-flex align-items-center gap-3" style={{ minWidth: 180 }}>
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0, backgroundColor: missed ? '#dc354520' : (isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(25,135,84,0.1)'), color: missed ? '#dc3545' : (isOwn ? '#fff' : '#198754') }}>
            <i className={`bi ${missed ? 'bi-telephone-x-fill' : 'bi-camera-video-fill'} fs-5`} />
          </div>
          <div>
            <div className="fw-bold" style={{ color: missed ? (isOwn ? '#ffcccc' : '#dc3545') : 'inherit' }}>{missed ? 'Missed Call' : 'Video Call'}</div>
            <div className="small opacity-75">{missed ? 'Missed' : fmt(sec)}</div>
          </div>
        </div>
      );
    } catch { return <span>{content}</span>; }
  };

  if (loading) {
    if (isFullTab) return <div className="text-center p-5"><div className="spinner-border text-primary" /></div>;
    return <div className="bg-white shadow-lg rounded border" style={{ position: 'fixed', bottom: 24, right: 24, width: 350, zIndex: 1050, transform: `translate(${position.x}px,${position.y}px)` }}><div className="p-3 text-center"><div className="spinner-border spinner-border-sm text-primary" /></div></div>;
  }

  const renderContent = () => (
    <>
      {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
      <div style={{ height: isFullTab ? 'calc(100vh - 350px)' : (isExpanded ? '350px' : '0px'), overflowY: 'auto', backgroundColor: '#f8f9fa', padding: (isExpanded || isFullTab) ? '1rem' : '0', transition: 'height 0.2s ease-in-out' }}>
        {(isExpanded || isFullTab) && messages.map((msg) => {
          const isOwn = String(msg.senderId || msg.uid) === String(currentUserId);
          const imageUrl = getFullUrl(msg.imageUrl);
          const videoUrl = getFullUrl(msg.videoUrl);
          const fileUrl = getFullUrl(msg.fileUrl);
          const audioSrc = getFullUrl(msg.audioUrl);
          const fullText = msg.content || msg.text || '';
          const isCallHistory = fullText.startsWith('[CALL_HISTORY]');
          const timeStr = formatTime(msg.createdAt || msg.timestamp);
          return (
            <div key={msg.messageId} className={`d-flex mb-3 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`}>
              <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 4 }}>
                {imageUrl && <img src={imageUrl} alt="sent" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 16, border: '1px solid #dee2e6', cursor: 'zoom-in', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }} onClick={() => setLightboxImage(imageUrl)} onLoad={scrollToBottom} />}
                {videoUrl && <video src={videoUrl} controls style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 16, border: '1px solid #dee2e6' }} onLoadedData={scrollToBottom} />}
                {fileUrl && (
                  <div onClick={() => { const fn = fileUrl.split('/').pop(); fetch(fileUrl).then(r => r.blob()).then(b => { const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = fn; document.body.appendChild(a); a.click(); URL.revokeObjectURL(u); }).catch(() => window.open(fileUrl, '_blank')); }}
                    className={`shadow-sm ${isOwn ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                    style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: 20, cursor: 'pointer' }}>
                    <i className="bi bi-file-earmark-arrow-down" style={{ fontSize: 22, marginRight: 10 }} />
                    <span style={{ wordBreak: 'break-all', fontWeight: 500, fontSize: '0.85rem' }}>{fileUrl.split('/').pop()}</span>
                  </div>
                )}
                {audioSrc && <MiniAudioPlayer src={audioSrc} isOwn={isOwn} />}
                {(fullText || isCallHistory) && (
                  <div className={`rounded shadow-sm ${isOwn ? 'bg-primary text-white' : 'bg-white text-dark border'}`} style={{ borderRadius: 20, padding: '10px 14px' }}>
                    {isCallHistory ? renderCallHistory(fullText, isOwn) : <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{fullText}</div>}
                  </div>
                )}
                <div className={`small text-muted ${isOwn ? 'text-end' : 'text-start'}`}>{timeStr}</div>
              </div>
            </div>
          );
        })}
        <div ref={scrollTo} />
        {readOnly && (isExpanded || isFullTab) && (
          <div className="text-center text-muted small py-2 border-top bg-white">
            <i className="bi bi-lock me-1"></i>{readOnlyMessage}
          </div>
        )}
      </div>

      {!readOnly && (isExpanded || isFullTab) && (
        <div className="border-top bg-white p-2">
          {selectedFile && (
            <div className="mb-2 p-2 bg-light border rounded d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                {selectedFile.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(selectedFile)} alt="preview" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, marginRight: 10 }} />
                ) : <i className="bi bi-file-earmark-text text-primary" style={{ fontSize: 24, marginRight: 10 }} />}
                <small className="text-truncate fw-medium" style={{ maxWidth: 200 }}>{selectedFile.name}</small>
              </div>
              <button className="btn btn-sm btn-outline-danger border-0" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}><i className="bi bi-x-lg" /></button>
            </div>
          )}
          <form className="d-flex align-items-center gap-2" onSubmit={sendMsg}>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
            <button type="button" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0 }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <i className="bi bi-paperclip fs-5 text-secondary" />
            </button>

            {isRecording ? (
              <div className="d-flex align-items-center bg-danger text-white rounded-pill px-3 flex-grow-1" style={{ height: 40 }}>
                <div className="spinner-grow spinner-grow-sm me-2" />
                <span className="fw-bold">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                <button className="btn btn-sm btn-light ms-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, padding: 0 }} onClick={stopRecording} type="button">
                  <i className="bi bi-stop-fill text-danger" />
                </button>
              </div>
            ) : audioBlob ? (
              <div className="d-flex align-items-center bg-light border rounded-pill px-3 flex-grow-1" style={{ height: 40 }}>
                <i className="bi bi-mic-fill text-primary me-2" />
                <span className="fw-bold text-primary">{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
                <button className="btn btn-sm btn-outline-danger ms-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, padding: 0 }} onClick={cancelRecording} type="button">
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            ) : (
              <input
                type="text"
                className="form-control rounded-pill"
                placeholder="Type a message..."
                value={formValue}
                onChange={e => setFormValue(e.target.value)}
                onPaste={handlePaste}
                disabled={uploading}
                style={{ height: 40 }}
              />
            )}

            {selectedFile ? (
              <button className="btn btn-success rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0 }} type="button" onClick={sendMedia} disabled={uploading}>
                {uploading ? <div className="spinner-border spinner-border-sm text-white" /> : <i className="bi bi-send-fill" />}
              </button>
            ) : audioBlob ? (
              <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0 }} type="button" onClick={sendAudio} disabled={uploading}>
                {uploading ? <div className="spinner-border spinner-border-sm text-white" /> : <i className="bi bi-send-fill" />}
              </button>
            ) : formValue.trim() ? (
              <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0 }} type="submit" disabled={uploading}>
                <i className="bi bi-send-fill" />
              </button>
            ) : (
              <button className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0 }} type="button" onClick={startRecording} disabled={uploading}>
                <i className="bi bi-mic-fill text-primary fs-5" />
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );

  if (isFullTab) return <div className="shadow-sm rounded-4 overflow-hidden border">{renderContent()}</div>;

  const canVideoCall = !readOnly && Boolean(resolvedPartnerUserId && currentRoom?.chatRoomId);

  return (
    <div
      ref={chatRef}
      className="shadow-lg rounded border bg-white" style={{ position: 'fixed', bottom: 24, right: 24, width: 350, zIndex: 1050, transform: `translate(${position.x}px,${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.1s ease' }}>
      <div className="bg-primary text-white p-2 d-flex justify-content-between align-items-center" style={{ cursor: isDragging ? 'grabbing' : 'grab', borderTopLeftRadius: '0.375rem', borderTopRightRadius: '0.375rem' }} onMouseDown={handleMouseDown}>
        <div className="d-flex align-items-center gap-2 fw-semibold" style={{ flex: 1 }}>
          <div className="position-relative">
            <div className="bg-success rounded-circle position-absolute" style={{ width: 10, height: 10, bottom: 0, right: 0, border: '2px solid white' }} />
            <i className="bi bi-person-circle fs-5" />
          </div>
          <span>{partnerName}</span>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-sm text-white border-0"
            style={{ opacity: canVideoCall ? 1 : 0.4 }}
            onClick={handleVideoCall}
            disabled={!canVideoCall}
            title="Video Call"
            type="button"
          >
            <i className="bi bi-camera-video-fill" />
          </button>
          <button className="btn btn-sm text-white border-0" onClick={() => setIsExpanded(p => !p)} type="button">
            <i className={`bi ${isExpanded ? 'bi-dash' : 'bi-plus-lg'}`} />
          </button>
          <button className="btn btn-sm text-white border-0" onClick={onClose} type="button"><i className="bi bi-x-lg" /></button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
