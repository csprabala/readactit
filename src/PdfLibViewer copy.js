import React, { useState, useCallback, useRef } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import Bot from './Bot';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function PdfLibViewer() {
    const [isLoading, setIsLoading] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [pdfText, setPdfText] = useState('');
    const [pdf, setPdf] = useState(null);
    const [pagePdfDoc, setPagePdfDoc] = useState(null);

    const iframeRef = useRef(null);

    const extractTextFromPdf = async (arrayBuffer) => {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        setPdf(pdf);

        return fullText;
    };

    const handleFileChange = useCallback(async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsLoading(true);
            const fileReader = new FileReader();
            fileReader.onload = async (e) => {
                const arrayBuffer = e.target.result;
                try {
                    const pdfDoc = await PDFDocument.load(arrayBuffer);
                    const pdfBytes = await pdfDoc.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    setPdfUrl(url);
                    setPagePdfDoc(pdfDoc);

                    // Extract text from PDF
                    const extractedText = await extractTextFromPdf(arrayBuffer);
                    setPdfText(extractedText);

                    // post data to backend server
                    const response = await fetch('http://localhost:8000/pdf-text', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ text: extractedText }),
                    });

                } catch (error) {
                    console.error('Error processing PDF:', error);
                }
                setIsLoading(false);
            };
            fileReader.readAsArrayBuffer(file);
        }

    }, []);

    async function findTextCoordinates(searchText) {

        function buildKMPTable(pattern) {
            const table = Array(pattern.length).fill(0);
            let j = 0;

            for (let i = 1; i < pattern.length; i++) {
                if (pattern[i] === pattern[j]) {
                    j++;
                    table[i] = j;
                } else if (j > 0) {
                    j = table[j - 1];
                    i--;
                }
            }

            return table;
        }

        function kmpSearch(text, pattern) {
            const table = buildKMPTable(pattern);
            let i = 0;
            let j = 0;
            const indices = [];

            while (i < text.length) {
                if (text[i] === pattern[j]) {
                    i++;
                    j++;
                    if (j === pattern.length) {
                        indices.push(i - j); // Match found, add the starting index to the array
                        j = table[j - 1]; // Continue searching for more matches
                    }
                } else if (j > 0) {
                    j = table[j - 1];
                } else {
                    i++;
                }
            }

            return indices; // Return all found indices
        }

        if (!pdf) {
            return;
        }

        // Iterate through each page
        for (let i = 0; i < pdf.numPages; i++) {
            const page = await pdf.getPage(i + 1);
            const textContent = await page.getTextContent();

            // Extract text items and their positions
            const textItems = textContent.items.map(item => ({
                str: item.str.replace(/\s+/g, ''), // Remove spaces
                transform: item.transform,
                width: item.width,
                height: item.height
            }));

            // Concatenate text items into a single string
            const pageText = textItems.map(item => item.str).join('');

            // Search for the specific multi-word text using KMP algorithm
            const searchIndices = kmpSearch(pageText, searchText.replace(/\s+/g, ''));
            if (searchIndices.length > 0) {
                // Get the corresponding pdf-lib page
                const pdfLibPage = pagePdfDoc.getPage(i);


                // Map the found positions back to the original text items
                searchIndices.forEach(async searchIndex => {
                    let charCount = 0;
                    for (const item of textItems) {
                        charCount += item.str.length;
                        if (charCount > searchIndex) {
                            const x = item.transform[4];
                            const y = page.view[3] - item.transform[5]; // PDF coordinates start from bottom-left
                            const width = item.width;
                            const height = item.height;

                            //Draw rectangle around the found text
                            pdfLibPage.drawRectangle({
                                x,
                                y: y - height,
                                width,
                                height,
                                borderColor: rgb(1, 0, 0),
                                borderWidth: 1,
                            });

                            const pdfBytes = await pagePdfDoc.save();
                            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                            const url = URL.createObjectURL(blob);

                            if (iframeRef.current) {
                                iframeRef.current.src = url;
                            }

                            

                            console.log(`Found text "${searchText}" on page ${i + 1} at position (${x}, ${y}) with bounding box [${x}, ${y}, ${x + width}, ${y - height}]`);
                            break;
                        }
                    }
                });
            }
        }



    }

    async function handleDataFromChild(data) {
        console.log('Data received from child:', data);

        data.forEach((textSegment) => {

            findTextCoordinates(textSegment);

        })

        // const pdfBytes = await pagePdfDoc.save();
        // const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        // const url = URL.createObjectURL(blob);

        // if (iframeRef.current) {
        //     iframeRef.current.src = url;
        // }
}

    return (
        <div>
            <div>
                <label htmlFor="pdfInput">Upload PDF: </label>
                <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    id="pdfInput"
                    aria-label="Upload PDF file"
                />
            </div>
            {isLoading && <div>Loading file...</div>}
            {pdfUrl && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                    <iframe ref={iframeRef}
                        src={pdfUrl}
                        style={{ width: 'calc(50% - 15px)', height: '100vh', border: '2px solid black' }}
                        title="PDF Viewer"
                    />
                    <Bot sendDataToParent={handleDataFromChild} />
                </div>
            )}
        </div>
    );
}

export default PdfLibViewer;