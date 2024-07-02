import React, { useState, useRef, useEffect } from 'react';
import Bot from './Bot';

const PdfViewer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [xhtmlContent, setXhtmlContent] = useState('');
  const [extractedText, setExtractedText] = useState(''); 
  // const [redactedContent, setRedactedContent] = useState('');
  const iframeRef = useRef(null);

  const uploadPdfFile = (file) => {
    setIsLoading(true); // Start loading
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
        console.log('Success:', 'xhtml content received');
        setXhtmlContent(xhtml); // Store the XHTML content
        let parsedText = extractTextFromXhtml(xhtml);
        // console.log('Extracted Text is: ', parsedText);
        setExtractedText(parsedText); // Extract text from the XHTML content
        setIsLoading(false); // Stop loading
      })
      .catch((error) => {
        console.error('Error:', error);
        setIsLoading(false); // Stop loading on error
      });
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      uploadPdfFile(file);
    }
  };

  const handleTextSelection = () => {
    console.log('Text selected in the pane');
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) return;
    const selection = iframe.contentWindow.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    if (!selectedText.trim()) return;

    // Create a span to mark the redacted text
    const redactedSpan = document.createElement('span');
    redactedSpan.style.backgroundColor = 'black';
    redactedSpan.style.color = 'black';
    redactedSpan.textContent = '[REDACTED]';

    range.deleteContents(); // Remove the selected text
    range.insertNode(redactedSpan); // Insert the redacted span in place of the selected text

    // Update the iframe content
    // const newContent = iframe.contentDocument.body.innerText;
    // setRedactedContent(newContent);
  };

  const extractTextFromXhtml = (xhtml) => {
    const parser = new DOMParser();
    // Use 'text/html' instead of 'application/xml'
    const doc = parser.parseFromString(xhtml, 'text/html');
  
    const extractTextFromNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent.trim();
      }
  
      if (node.nodeType === Node.ELEMENT_NODE) {
        // Ignore script and style elements
        if (node.tagName.toLowerCase() === 'script' || node.tagName.toLowerCase() === 'style') {
          return '';
        }
  
        // Recursively extract text from child nodes
        return Array.from(node.childNodes)
          .map(extractTextFromNode)
          .filter(text => text.length > 0)
          .join(' ');
      }
  
      return '';
    };
  
    // Check if parsing produced errors
    const parserErrors = doc.querySelector('parsererror');
    if (parserErrors) {
      console.warn('Parser errors detected:', parserErrors.textContent);
      // You might want to handle this case differently
    }
  
    const textContent = extractTextFromNode(doc.body);
    return textContent.replace(/\s+/g, ' ').trim();
  };

  console.log('Outside useEffect');
  useEffect(() => {
    console.log('First useEffect call')
    const iframe = iframeRef.current;
    // console.log(iframe);
    if (!iframe) return;

    console.log('Inside useEffect');

    const handleLoad = () => {
      if (iframe.contentWindow) {
        console.log('iframe event listener added');
        iframe.contentWindow.addEventListener('mouseup', handleTextSelection);
      }
    };

    // Listen for the load event on the iframe
    iframe.addEventListener('load', handleLoad);

    return () => {
      if (iframe.contentWindow) {
        console.log('iframe event listener removed');
        iframe.contentWindow.removeEventListener('mouseup', handleTextSelection);
      }
      // Clean up the load event listener as well
      iframe.removeEventListener('load', handleLoad);
    };
  }, [xhtmlContent]);

  return (
    <div>
      <div>
        <label htmlFor="pdfInput">Upload PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          id="pdfInput"
          aria-label="Upload PDF file"
        />
      </div>
      <div style={{ display: isLoading || !xhtmlContent ? 'none' : 'flex', justifyContent: 'space-between', padding: '10px' }}>
        <iframe ref={iframeRef} srcDoc={xhtmlContent} style={{ width: 'calc(50% - 15px)', height: '100vh', border: '2px solid black' }}></iframe>
        <Bot />

        {/* <div style={{ width: 'calc(50% - 15px)', height: '100vh', overflow: 'auto', border: '2px solid black', padding: '10px' }}>
          {extractedText}
        </div> */}
        {/* <iframe srcDoc={redactedContent || xhtmlContent} style={{ width: 'calc(50% - 15px)', height: '100vh', border: '2px solid black' }}></iframe> */}
      </div>
      {isLoading && <div>Loading file...</div>}
    </div>

  );
};

export default PdfViewer;