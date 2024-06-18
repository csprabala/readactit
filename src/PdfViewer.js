import React, { useState } from 'react';

function PdfViewer() {
  const [pdfFile, setPdfFile] = useState(null);
  const [xhtmlContent, setXhtmlContent] = useState(''); // State to store XHTML content

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPdfFile(URL.createObjectURL(file));
      // Upload the file immediately after selection
      uploadPdfFile(file);
    }
  };

  const uploadPdfFile = (file) => {
    const formData = new FormData();
    const timestamp = new Date().getTime();
    const filenameWithTimestamp = `${timestamp}-${file.name}`;
    formData.append('file', file, filenameWithTimestamp);
    fetch('http://localhost:8000/upload', {
      method: 'POST',
      body: formData,
    })
      .then((response) => response.text())
      .then((xhtml) => {
        console.log('Success:', xhtml);
        setXhtmlContent(xhtml); // Store the XHTML content
      })
      .catch((error) => {
        console.error('Error:', error);
      });
  };

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {pdfFile && <iframe src={pdfFile} width="100%" height="600px" />}
      {xhtmlContent && (
        <div dangerouslySetInnerHTML={{ __html: xhtmlContent }} /> // Display the XHTML content
      )}
    </div>
  );
}

export default PdfViewer;