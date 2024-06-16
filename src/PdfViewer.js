import React, { useState } from 'react';

function PdfViewer() {
  const [pdfFile, setPdfFile] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setPdfFile(URL.createObjectURL(file));
    }
  };

  return (
    <div>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {pdfFile && <iframe src={pdfFile} width="100%" height="600px" />}
    </div>
  );
}

export default PdfViewer;