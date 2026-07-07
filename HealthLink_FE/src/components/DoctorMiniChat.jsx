import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getOrCreateRoom, getRoomMessages, sendMessage as apiSendMessage, markAsRead, uploadMedia } from '../api/chatApi';
import stompChatService from '../services/stompChatService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_SPRING_API_BASE_URL || 'http://localhost:8096';
const getFullUrl = (url) => {
  if (!url || url === 'null' || url === 'undefined') return null;
  if (url.startsWith('/')) return `${BASE_URL.replace('/api/v1', '')}${url}`;
  return url;
};

/** ImageLightbox giống hệt ChatPage */
function ImageLightbox({ src, onClose }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  const onWheel = (e) => setScale(s => Math.min(Math.max(0.5, s - e.deltaY * 0.002), 5));
  const onMD = (e) => { if (scale > 1) { setDragging(true); setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y }); } };
  const onMM = (e) => { if (dragging) setPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const onMU = () => setDragging(false);
  return createPortal(
    <div onClick={onClose} onWheel={onWheel} onMouseMove={onMM} onMouseUp={onMU} onMouseLeave={onMU}
      style={{ position:'fixed', inset:0, zIndex:99999, backgroundColor:'rgba(0,0,0,0.85)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
      <button onClick={onClose} style={{ position:'absolute', top:16, right:20, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'50%', width:40, height:40, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff', fontSize:'1.2rem', zIndex:100000 }}>
        <i className="bi bi-x-lg" />
      </button>
      <div style={{ position:'absolute', bottom:30, display:'flex', gap:12, background:'rgba(0,0,0,0.5)', padding:'8px 16px', borderRadius:30, zIndex:100000 }}>
        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s+0.25,5)); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width:36, height:36 }}><i className="bi bi-zoom-in" /></button>
        <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s-0.25,0.5)); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width:36, height:36 }}><i className="bi bi-zoom-out" /></button>
        <button onClick={(e) => { e.stopPropagation(); setScale(1); setPos({ x:0, y:0 }); }} className="btn btn-sm btn-outline-light rounded-circle" style={{ width:36, height:36 }}><i className="bi bi-arrow-counterclockwise" /></button>
      </div>
      <img src={src} alt="preview" onMouseDown={onMD} onClick={(e) => e.stopPropagation()} draggable="false"
        style={{ transform:`translate(${pos.x}px,${pos.y}px) scale(${scale})`, transition: dragging ? 'none' : 'transform 0.15s ease-out', maxWidth:'90vw', maxHeight:'90vh', objectFit:'contain', boxShadow:'0 8px 40px rgba(0,0,0,0.6)', cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default', userSelect:'none' }}
      />
    </div>,
    document.body
  );
}

/** Custom audio player giống ChatPage */
function MiniAudioPlayer({ src, isOwn }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);
  const fmt = (t) => { if (isNaN(t) || !isFinite(t)) return '0:00'; return `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`; };
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'10px', background: isOwn ? '#0d6efd' : '#fff', padding:'10px 14px', borderRadius:'20px', minWidth:'200px', border: isOwn ? 'none' : '1px solid #dee2e6', color: isOwn ? '#fff' : '#212529' }}>
      <button onClick={() => { if (!audioRef.current||error) return; isPlaying ? audioRef.current.pause() : audioRef.current.play().catch(()=>setError(true)); }} style={{ width:34, height:34, borderRadius:'50%', border:'none', display:'flex', alignItems:'center', justifyContent:'center', background: isOwn ? '#fff' : '#0d6efd', color: isOwn ? '#0d6efd' : '#fff', cursor: error ? 'not-allowed' : 'pointer', flexShrink:0 }}>
        <i className={`bi ${error ? 'bi-exclamation-circle' : isPlaying ? 'bi-pause-fill' : 'bi-play-fill'}`} />
      </button>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ height:4, background: isOwn ? 'rgba(255,255,255,0.3)' : '#e9ecef', borderRadius:2, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${pct}%`, background: isOwn ? '#fff' : '#0d6efd', borderRadius:2, transition:'width 0.1s' }} />
        </div>
        <div style={{ fontSize:'0.75rem', marginTop:2, opacity:0.8 }}>{fmt(currentTime)} / {fmt(duration)}</div>
      </div>
      <audio ref={audioRef} src={src} onTimeUpdate={()=>setCurrentTime(audioRef.current?.currentTime||0)} onLoadedMetadata={()=>setDuration(audioRef.current?.duration||0)} onPlay={()=>setIsPlaying(true)} onPause={()=>setIsPlaying(false)} onEnded={()=>{setIsPlaying(false);setCurrentTime(0);}} onError={()=>setError(true)} style={{display:'none'}} />
    </div>
  );
}

export default function DoctorMiniChat({ doctorId, patientId, patientName, appointmentId, isFullTab, onClose }) {
  const { user: authUser, currentUserId, initiateCall, isInCall } = useAuth();
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  // Dragging
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const chatRef = useRef(null);
  const scrollTo = useRef(null);

  const isExpandedRef = useRef(isExpanded);
  useEffect(() => {
    isExpandedRef.current = isExpanded;
  }, [isExpanded]);

  const currentRoomRef = useRef(null);
  const doctorIdRef = useRef(doctorId);
  useEffect(() => { doctorIdRef.current = doctorId; }, [doctorId]);

  const initRoom = useCallback(async () => {
    if (!doctorId || !patientId) return;
    setLoading(true);
    try {
      const room = await getOrCreateRoom(patientId, appointmentId);
      setCurrentRoom(room);
      currentRoomRef.current = room;
      const msgs = await getRoomMessages(room.chatRoomId, 0, 50);
      setMessages(msgs);
      if (isExpandedRef.current) {
        markAsRead(room.chatRoomId)
          .then(() => window.dispatchEvent(new CustomEvent('chat-read-updated')))
          .catch(() => {});
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to connect to chat room');
    } finally {
      setLoading(false);
    }
  }, [doctorId, patientId, appointmentId]);

  useEffect(() => { initRoom(); }, [initRoom]);

  // Khi doctor mở rộng khung chat → đánh dấu đã đọc các tin nhắn đang hiển thị
  useEffect(() => {
    if (isExpanded && currentRoomRef.current?.chatRoomId) {
      markAsRead(currentRoomRef.current.chatRoomId)
        .then(() => window.dispatchEvent(new CustomEvent('chat-read-updated')))
        .catch(() => {});
    }
  }, [isExpanded]);

  // Đăng ký nhận tin nhắn STOMP — pattern giống ChatPage
  useEffect(() => {
    if (!authUser) return;

    const unsub = stompChatService.subscribeToChat((msg) => {
      const room = currentRoomRef.current;
      if (!room) return;

      // Bỏ qua tin nhắn hệ thống
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
        // Nếu là tin nhắn doctor vừa gửi → thay thế temp
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

      // Chỉ markAsRead khi khung chat đang mở rộng
      if (String(msg.senderId) !== String(doctorIdRef.current) && isExpandedRef.current) {
        markAsRead(room.chatRoomId)
          .then(() => window.dispatchEvent(new CustomEvent('chat-read-updated')))
          .catch(() => {});
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, [authUser, currentUserId]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollTo.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isExpanded, scrollToBottom]);

  // ── Drag ──
  const handleMouseDown = (e) => {
    if (isFullTab) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    // The popup starts at bottom:24 right:24, so we compute boundary relative to that anchor.
    // Visual positions when transform is (x,y):
    //   left  = (vw - 24 - 350) + x   → must be >= 0       → x >= -(vw - 374)
    //   right = (vw - 24) + x          → must be <= vw      → x <= 24
    //   top   = (vh - 24 - h) + y     → must be >= 0       → y >= -(vh - 24 - h)
    //   bottom= (vh - 24) + y         → must be <= vh      → y <= 24
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const chatWidth = 350;
    const chatHeight = chatRef.current ? chatRef.current.offsetHeight : 500;

    let newX = e.clientX - dragStartPos.current.x;
    let newY = e.clientY - dragStartPos.current.y;

    newX = Math.max(newX, -(vw - 24 - chatWidth)); // prevent going off left
    newX = Math.min(newX, 24);                      // prevent going off right
    newY = Math.max(newY, -(vh - 24 - chatHeight)); // prevent going off top
    newY = Math.min(newY, 24);                      // prevent going off bottom

    setPosition({ x: newX, y: newY });
  }, [isDragging]);
  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  useEffect(() => {
    if (isDragging) { window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mouseup', handleMouseUp); }
    else { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); }
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ── Send text ──
  const sendMsg = async (e) => {
    e.preventDefault();
    if (selectedFile) { await sendMedia(); return; }
    if (audioBlob) { await sendAudio(); return; }
    if (!formValue.trim() || !currentRoom) return;
    const text = formValue.trim();
    setFormValue('');
    const optimistic = { messageId: `temp_${Date.now()}`, senderId: doctorId, content: text, createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    try {
      const saved = await apiSendMessage({ chatRoomId: currentRoom.chatRoomId, receiverId: patientId, content: text });
      setMessages(prev => prev.map(m => m.messageId === optimistic.messageId ? saved : m));
      scrollToBottom();
    } catch {
      toast.error('Failed to send message');
      setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
      setFormValue(text);
    }
  };

  // ── Send file/image/video ──
  const sendMedia = async () => {
    if (!selectedFile || !currentRoom) return;
    setUploading(true);
    try {
      const mime = selectedFile.type;
      let type = 'file';
      if (mime.startsWith('image/')) type = 'image';
      else if (mime.startsWith('video/')) type = 'video';
      const res = await uploadMedia(currentRoom.chatRoomId, type, selectedFile);
      const payload = { chatRoomId: currentRoom.chatRoomId, receiverId: patientId };
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

  // ── Voice recording ──
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
    if (!audioBlob || !currentRoom) return;
    setUploading(true);
    try {
      const mime = audioBlob.type || 'audio/webm';
      const ext = mime.includes('wav') ? 'wav' : mime.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([audioBlob], `audio_${Date.now()}.${ext}`, { type: mime });
      const res = await uploadMedia(currentRoom.chatRoomId, 'audio', file);
      const saved = await apiSendMessage({ chatRoomId: currentRoom.chatRoomId, receiverId: patientId, audioUrl: res.url });
      setMessages(prev => prev.some(m => m.messageId === saved.messageId) ? prev : [...prev, saved]);
      setAudioBlob(null);
      setRecordingDuration(0);
      scrollToBottom();
    } catch { toast.error('Failed to send audio!'); }
    finally { setUploading(false); }
  };

  // ── Paste ──
  const handleVideoCall = () => {
    if (!patientId) {
      toast.error('Patient information is missing. Please refresh and try again.');
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

    const callerName =
      authUser?.fullName ||
      authUser?.preferred_username ||
      authUser?.email ||
      'Doctor';

    initiateCall(patientId, room.chatRoomId, patientName || 'Patient', callerName);
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
      parts.forEach(p => { const [k,v] = p.split(':'); if (k&&v) d[k]=v; });
      const status = d.status || 'UNKNOWN';
      const sec = parseInt(d.duration) || 0;
      const missed = status === 'MISSED' || status === 'DECLINED';
      const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
      return (
        <div className="d-flex align-items-center gap-3" style={{ minWidth: 180 }}>
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width:40, height:40, flexShrink:0, backgroundColor: missed ? '#dc354520' : (isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(25,135,84,0.1)'), color: missed ? '#dc3545' : (isOwn ? '#fff' : '#198754') }}>
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
    return <div className="bg-white shadow-lg rounded border" style={{ position:'fixed', bottom:24, right:24, width:350, zIndex:1050, transform:`translate(${position.x}px,${position.y}px)` }}><div className="p-3 text-center"><div className="spinner-border spinner-border-sm text-primary" /></div></div>;
  }

  const renderContent = () => (
    <>
      {lightboxImage && <ImageLightbox src={lightboxImage} onClose={() => setLightboxImage(null)} />}
      <div style={{ height: isFullTab ? 'calc(100vh - 350px)' : (isExpanded ? '350px' : '0px'), overflowY:'auto', backgroundColor:'#f8f9fa', padding: (isExpanded||isFullTab) ? '1rem' : '0', transition:'height 0.2s ease-in-out' }}>
        {(isExpanded || isFullTab) && messages.map((msg) => {
          const isOwn = msg.senderId === doctorId || msg.uid === doctorId;
          const imageUrl = getFullUrl(msg.imageUrl);
          const videoUrl = getFullUrl(msg.videoUrl);
          const fileUrl = getFullUrl(msg.fileUrl);
          const audioSrc = getFullUrl(msg.audioUrl);
          const fullText = msg.content || msg.text || '';
          const isCallHistory = fullText.startsWith('[CALL_HISTORY]');
          const timeStr = formatTime(msg.createdAt || msg.timestamp);
          return (
            <div key={msg.messageId} className={`d-flex mb-3 ${isOwn ? 'justify-content-end' : 'justify-content-start'}`}>
              <div style={{ maxWidth:'80%', display:'flex', flexDirection:'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap:4 }}>
                {imageUrl && <img src={imageUrl} alt="sent" style={{ maxWidth:'100%', maxHeight:200, borderRadius:16, border:'1px solid #dee2e6', cursor:'zoom-in', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' }} onClick={() => setLightboxImage(imageUrl)} onLoad={scrollToBottom} />}
                {videoUrl && <video src={videoUrl} controls style={{ maxWidth:'100%', maxHeight:200, borderRadius:16, border:'1px solid #dee2e6' }} onLoadedData={scrollToBottom} />}
                {fileUrl && (
                  <div onClick={() => { const fn=fileUrl.split('/').pop(); fetch(fileUrl).then(r=>r.blob()).then(b=>{ const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=fn; document.body.appendChild(a); a.click(); URL.revokeObjectURL(u); }).catch(()=>window.open(fileUrl,'_blank')); }}
                    className={`shadow-sm ${isOwn ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                    style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderRadius:20, cursor:'pointer' }}>
                    <i className="bi bi-file-earmark-arrow-down" style={{ fontSize:22, marginRight:10 }} />
                    <span style={{ wordBreak:'break-all', fontWeight:500, fontSize:'0.85rem' }}>{fileUrl.split('/').pop()}</span>
                  </div>
                )}
                {audioSrc && <MiniAudioPlayer src={audioSrc} isOwn={isOwn} />}
                {(fullText || isCallHistory) && (
                  <div className={`rounded shadow-sm ${isOwn ? 'bg-primary text-white' : 'bg-white text-dark border'}`} style={{ borderRadius:20, padding:'10px 14px' }}>
                    {isCallHistory ? renderCallHistory(fullText, isOwn) : <div style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{fullText}</div>}
                  </div>
                )}
                <div className={`small text-muted ${isOwn ? 'text-end' : 'text-start'}`}>{timeStr}</div>
              </div>
            </div>
          );
        })}
        <div ref={scrollTo} />
      </div>

      {(isExpanded || isFullTab) && (
        <div className="border-top bg-white p-2">
          {/* File preview */}
          {selectedFile && (
            <div className="mb-2 p-2 bg-light border rounded d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                {selectedFile.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(selectedFile)} alt="preview" style={{ width:40, height:40, objectFit:'cover', borderRadius:4, marginRight:10 }} />
                ) : <i className="bi bi-file-earmark-text text-primary" style={{ fontSize:24, marginRight:10 }} />}
                <small className="text-truncate fw-medium" style={{ maxWidth:200 }}>{selectedFile.name}</small>
              </div>
              <button className="btn btn-sm btn-outline-danger border-0" onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value=''; }}><i className="bi bi-x-lg" /></button>
            </div>
          )}
          <form className="d-flex align-items-center gap-2" onSubmit={sendMsg}>
            <input type="file" ref={fileInputRef} style={{ display:'none' }} onChange={handleFileSelect} />
            <button type="button" className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width:40, height:40, flexShrink:0 }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <i className="bi bi-paperclip fs-5 text-secondary" />
            </button>

            {isRecording ? (
              <div className="d-flex align-items-center bg-danger text-white rounded-pill px-3 flex-grow-1" style={{ height:40 }}>
                <div className="spinner-grow spinner-grow-sm me-2" />
                <span className="fw-bold">{Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2,'0')}</span>
                <button className="btn btn-sm btn-light ms-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width:28, height:28, padding:0 }} onClick={stopRecording} type="button">
                  <i className="bi bi-stop-fill text-danger" />
                </button>
              </div>
            ) : audioBlob ? (
              <div className="d-flex align-items-center bg-light border rounded-pill px-3 flex-grow-1" style={{ height:40 }}>
                <i className="bi bi-mic-fill text-primary me-2" />
                <span className="fw-bold text-primary">{Math.floor(recordingDuration/60)}:{(recordingDuration%60).toString().padStart(2,'0')}</span>
                <button className="btn btn-sm btn-outline-danger ms-2 rounded-circle d-flex align-items-center justify-content-center" style={{ width:28, height:28, padding:0 }} onClick={cancelRecording} type="button">
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
                style={{ height:40 }}
              />
            )}

            {selectedFile ? (
              <button className="btn btn-success rounded-circle d-flex align-items-center justify-content-center" style={{ width:40, height:40, flexShrink:0 }} type="button" onClick={sendMedia} disabled={uploading}>
                {uploading ? <div className="spinner-border spinner-border-sm text-white" /> : <i className="bi bi-send-fill" />}
              </button>
            ) : audioBlob ? (
              <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width:40, height:40, flexShrink:0 }} type="button" onClick={sendAudio} disabled={uploading}>
                {uploading ? <div className="spinner-border spinner-border-sm text-white" /> : <i className="bi bi-send-fill" />}
              </button>
            ) : formValue.trim() ? (
              <button className="btn btn-primary rounded-circle d-flex align-items-center justify-content-center" style={{ width:40, height:40, flexShrink:0 }} type="submit" disabled={uploading}>
                <i className="bi bi-send-fill" />
              </button>
            ) : (
              <button className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width:40, height:40, flexShrink:0 }} type="button" onClick={startRecording} disabled={uploading}>
                <i className="bi bi-mic-fill text-primary fs-5" />
              </button>
            )}
          </form>
        </div>
      )}
    </>
  );

  if (isFullTab) return <div className="shadow-sm rounded-4 overflow-hidden border">{renderContent()}</div>;

  return (
    <div
      ref={chatRef}
      className="shadow-lg rounded border bg-white" style={{ position:'fixed', bottom:24, right:24, width:350, zIndex:1050, transform:`translate(${position.x}px,${position.y}px)`, transition: isDragging ? 'none' : 'transform 0.1s ease' }}>
      <div className="bg-primary text-white p-2 d-flex justify-content-between align-items-center" style={{ cursor: isDragging ? 'grabbing' : 'grab', borderTopLeftRadius:'0.375rem', borderTopRightRadius:'0.375rem' }} onMouseDown={handleMouseDown}>
        <div className="d-flex align-items-center gap-2 fw-semibold" style={{ flex:1 }}>
          <div className="position-relative">
            <div className="bg-success rounded-circle position-absolute" style={{ width:10, height:10, bottom:0, right:0, border:'2px solid white' }} />
            <i className="bi bi-person-circle fs-5" />
          </div>
          <span>{patientName}</span>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm btn-link text-white p-0 border-0"
            title="Video Call"
            onClick={(event) => {
              event.stopPropagation();
              handleVideoCall();
            }}
          >
            <i className="bi bi-camera-video" />
          </button>
          <button type="button" className="btn btn-sm btn-link text-white p-0 border-0" onClick={(e) => { e.stopPropagation(); setIsExpanded(v => !v); }}>
            <i className={`bi ${isExpanded ? 'bi-dash-lg' : 'bi-chevron-up'}`} />
          </button>
          <button type="button" className="btn btn-sm btn-link text-white p-0 border-0" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}
