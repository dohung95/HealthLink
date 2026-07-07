import React, { useEffect, useRef, useState } from 'react';

export default function ClinicalResultFilePane({ file, onFileSelect, existingFileLocation }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (existingFileLocation) {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8096';
      setPreviewUrl(existingFileLocation.startsWith('http') ? existingFileLocation : `${base}${existingFileLocation}`);
      return () => {};
    }
    setPreviewUrl(null);
  }, [file, existingFileLocation]);

  const isExistingPdf = existingFileLocation?.toLowerCase?.().endsWith('.pdf');
  const isImage = file?.type?.startsWith('image/') || (!!existingFileLocation && !isExistingPdf);
  const isPdf = file?.type === 'application/pdf' || isExistingPdf;

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && (f.type.startsWith('image/') || f.type === 'application/pdf')) {
      onFileSelect(f);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onFileSelect(f);
  };

  if (!file && !existingFileLocation) {
    return (
      <div
        className={`cr-file-pane cr-file-pane--empty ${dragOver ? 'cr-file-pane--drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="d-none" onChange={handleChange} />
        <i className="bi bi-cloud-arrow-up cr-file-pane__icon"></i>
        <p className="cr-file-pane__text">Drop lab image or PDF here</p>
        <p className="cr-file-pane__subtext">Upload the original report for review.</p>
      </div>
    );
  }

  return (
    <div className="cr-file-pane">
      <div className="cr-file-pane__toolbar">
        <span className="cr-file-pane__name">
          {file ? file.name : 'View existing file'}
        </span>
        <label className="cr-file-pane__change">
          <input type="file" accept="image/*,.pdf" className="d-none" onChange={handleChange} />
          <i className="bi bi-arrow-repeat"></i> Change
        </label>
      </div>
      <div className="cr-file-pane__preview">
        {isImage && previewUrl ? (
          <img src={previewUrl} alt="Preview" className="cr-file-pane__img" />
        ) : isPdf || existingFileLocation ? (
          <iframe src={previewUrl} title="File preview" className="cr-file-pane__iframe" />
        ) : (
          <div className="cr-file-pane__placeholder">
            <i className="bi bi-file-earmark cr-file-pane__icon"></i>
            <p className="cr-file-pane__text">Preview not available</p>
          </div>
        )}
      </div>
    </div>
  );
}
