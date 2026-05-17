import { useRef } from "react";

const DocumentsStep = ({
    symptoms,
    setSymptoms,
    files,
    setFiles,
    onBack,
    onNext, }) => {
    const fileRef = useRef();

    const handleFileChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []).map((file) => ({
            name: file.name,
            size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
            type: file.type.includes('pdf') ? 'pdf' : 'image',
        }));

        setFiles((prev) => [...prev, ...selectedFiles]);
    };

    const removeFile = (index) => {
        setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
    };
    return (
        <div className="schedule-card">
            <h2>Symptoms & medical documents</h2>
            <p className="schedule-card-subtitle">
                Describe your current condition so the doctor can better prepare.
            </p>

            <div className="symptom-field">
                <label>Symptoms / reason for examination</label>
                <textarea
                    rows={5}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Example: mild chest pain for the past 2 days, shortness of breath when exercising..."
                />
            </div>

            <div
                className="upload-box"
                onClick={() => fileRef.current?.click()}
            >
                <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                <i className="bi bi-paperclip"></i>
                <strong>Upload medical documents</strong>
                <span>PDF, JPG, PNG</span>
            </div>

            {files.length > 0 && (
                <div className="file-list">
                    {files.map((file, index) => (
                        <div key={`${file.name}-${index}`} className="file-item">
                            <div>
                                <i
                                    className={
                                        file.type === 'pdf'
                                            ? 'bi bi-file-earmark-pdf'
                                            : 'bi bi-image'
                                    }
                                ></i>
                            </div>

                            <div className="file-meta">
                                <strong>{file.name}</strong>
                                <span>{file.size}</span>
                            </div>

                            <button type="button" onClick={() => removeFile(index)}>
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="documents-note">
                Lưu ý: phần file hiện mới là giao diện phía frontend, chưa được gửi thật
                lên backend trong flow đặt lịch hiện tại.
            </div>

            <div className="schedule-actions">
                <button type="button" className="btn-outline-soft" onClick={onBack}>
                    Back
                </button>

                <button type="button" className="btn-primary-soft" onClick={onNext}>
                    Review
                </button>
            </div>
        </div>
    );
}

export default DocumentsStep;