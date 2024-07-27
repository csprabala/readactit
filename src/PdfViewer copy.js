import React, { useState, useRef, useEffect } from 'react';
import Bot from './Bot';

const PdfViewer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [xhtmlContent, setXhtmlContent] = useState('');

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

  const handleDataFromChild = (data) => {
    console.log('Data received from child:', data);
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument || !iframe.contentWindow) {
      console.error('Cannot access iframe content');
      return;
    }

    const iframeDoc = iframe.contentDocument;
    let foundSegments = new Set();

    const parentDivs = iframeDoc.querySelectorAll('div[data-page-no]');
    console.log('Total parent divs found:', parentDivs.length);

    // Remove unnecessary spans
    parentDivs.forEach((parentDiv) => {
      const childDivs = Array.from(parentDiv.getElementsByTagName('div')).slice(1);
      console.log('Total child divs found in parent:', childDivs.length);

      for (let div of childDivs) {
        let divText = '';

        // Use a stack to traverse all child nodes iteratively
        const stack = [div];
        while (stack.length > 0) {
          const node = stack.pop();
          if (node.nodeType === Node.TEXT_NODE || node.nodeName === 'SPAN') {
            divText += node.textContent;
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            for (let i = node.childNodes.length - 1; i >= 0; i--) {
              stack.push(node.childNodes[i]);
            }
          }
        }

        console.log('Div text:', divText);

        // Check for each text segment
        data.forEach((textSegment) => {
          if (divText.includes(textSegment)) {
            console.log('Found text to redact:', textSegment, 'in div:', div);
            // Redact the specific text in the div
            redactDiv(div, textSegment);
            console.log('Redacted text in div:', textSegment);
            foundSegments.add(textSegment);
          }
        });
      }
    });

    // Log any segments that weren't found
    data.forEach((textSegment) => {
      if (!foundSegments.has(textSegment)) {
        console.log('Text not found:', textSegment);
      }
    });
  };

   // Function to redact a div
   const redactDiv = (div, textToRedact) => {
    const stack = [div];
    let accumulatedText = '';
    let accumulatedNodes = [];
  
    const redactInNode = (node, startIndex, endIndex) => {
      const text = node.textContent;
      const beforeText = text.slice(0, startIndex);
      const redactedText = '█'.repeat(endIndex - startIndex);
      const afterText = text.slice(endIndex);
      const newTextNode = document.createTextNode(beforeText + redactedText + afterText);
      node.parentNode.replaceChild(newTextNode, node);
    };
  
    const findBestMatch = (text, pattern) => {
      const m = text.length;
      const n = pattern.length;
      const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
      let maxLength = 0;
      let endIndex = 0;
  
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (text[i - 1].toLowerCase() === pattern[j - 1].toLowerCase()) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
            if (dp[i][j] > maxLength) {
              maxLength = dp[i][j];
              endIndex = i;
            }
          }
        }
      }
  
      return maxLength >= n * 1 ? [endIndex - maxLength, endIndex] : null;
    };
  
    while (stack.length > 0) {
      const node = stack.pop();
      if (node.nodeType === Node.TEXT_NODE || node.nodeName === 'SPAN') {
        accumulatedText += node.textContent;
        accumulatedNodes.push(node);
  
        const match = findBestMatch(accumulatedText, textToRedact);
        if (match) {
          const [startIndex, endIndex] = match;
          let currentIndex = 0;
  
          accumulatedNodes.forEach(accNode => {
            const nodeLength = accNode.textContent.length;
            if (currentIndex + nodeLength > startIndex && currentIndex < endIndex) {
              const nodeStartIndex = Math.max(0, startIndex - currentIndex);
              const nodeEndIndex = Math.min(nodeLength, endIndex - currentIndex);
              redactInNode(accNode, nodeStartIndex, nodeEndIndex);
            }
            currentIndex += nodeLength;
          });
  
          // Reset accumulation
          accumulatedText = accumulatedText.slice(endIndex);
          accumulatedNodes = accumulatedNodes.filter(node => 
            currentIndex > endIndex || node.textContent.length > 0);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          stack.push(node.childNodes[i]);
        }
      }
    }
  };


  return (
    <div>
      <div>
        <label htmlFor="pdfInput">Upload PDF:   </label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          id="pdfInput"
          aria-label="Upload PDF file"
        />
      </div>
      {isLoading && <div>Loading file...</div>}
      <div style={{ display:  'flex', justifyContent: 'space-between', padding: '10px' }}>
        <iframe ref={iframeRef} srcDoc={xhtmlContent} style={{ width: 'calc(50% - 15px)', height: '100vh', border: '2px solid black' }}></iframe>
        <Bot sendDataToParent={handleDataFromChild} />

        {/* <div style={{ width: 'calc(50% - 15px)', height: '100vh', overflow: 'auto', border: '2px solid black', padding: '10px' }}>
          {extractedText}
        </div> */}
        {/* <iframe srcDoc={redactedContent || xhtmlContent} style={{ width: 'calc(50% - 15px)', height: '100vh', border: '2px solid black' }}></iframe> */}
      </div>
      
    </div>

  );
};

export default PdfViewer;