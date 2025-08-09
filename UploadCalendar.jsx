function UploadCalendar({ onCalendarUploaded }) {
    const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      onCalendarUploaded(text); // Skickar raw .ics-text till backend
    };
  
    return (
      <div>
        <label>Upload your calendar (.ics):</label>
        <input type="file" accept=".ics" onChange={handleFileUpload} />
      </div>
    );
  }
  
  export default UploadCalendar;
  