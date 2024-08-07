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


  function extractTextNodes(node, textNodes = []) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node);
    } else {
      node.childNodes.forEach(child => extractTextNodes(child, textNodes));
    }
    return textNodes;
  }

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

      let concatenatedText = '';
      let textNodes = [];
      let textNodeInfo = [];

      childDivs.forEach((div, divIndex) => {
        const nodes = extractTextNodes(div);
        nodes.forEach((node, nodeIndex) => {
          textNodes.push(node);
          textNodeInfo.push({ divIndex, nodeIndex, startPos: concatenatedText.length, endPos: concatenatedText.length + node.textContent.length });
          concatenatedText += node.textContent;
        });
      });

      data.forEach(searchString => {
        console.log('Searching for:', searchString);
        let startIndex = concatenatedText.indexOf(searchString);
        console.log('Start index:', startIndex);
        console.log('text at index', concatenatedText.substring(startIndex, startIndex + searchString.length));
        while (startIndex !== -1) {
          let currentIndex = startIndex;
          let remainingLength = searchString.length;

          for (let i=0; i<textNodeInfo.length; i++) {
            if (currentIndex >= textNodeInfo[i].startPos && currentIndex < textNodeInfo[i].endPos) {
              let node = textNodes[i];
              if (!node || !node.parentNode) continue;
              
              console.log("text content", node.textContent);


              let start = currentIndex - textNodeInfo[i].startPos;
              let end = Math.min(node.textContent.length, start + remainingLength);

              // Highlight the matched text
              let part1 = node.textContent.substring(0, start);
              console.log("part1", part1);
              let part2 = node.textContent.substring(start, end);
              console.log("part2", part2);
              let part3 = node.textContent.substring(end);
              console.log("part3", part3);

              let span = document.createElement('span');
              span.style.backgroundColor = 'yellow';
              span.textContent = part2;

              let parent = node.parentNode;
              parent.insertBefore(document.createTextNode(part1), node);
              parent.insertBefore(span, node);
              parent.insertBefore(document.createTextNode(part3), node);
              parent.removeChild(node);

              remainingLength -= (end - start);
              currentIndex += (end - start);

            }
            if (remainingLength <= 0) {
              break;
            }

          }

          startIndex = concatenatedText.indexOf(searchString, startIndex + searchString.length);

        }


      });

    });

    // Log any segments that weren't found
    data.forEach((textSegment) => {
      if (!foundSegments.has(textSegment)) {
        console.log('Text not found:', textSegment);
      }
    });
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
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
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