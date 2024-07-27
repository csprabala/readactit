import React, { useState, useCallback, useRef } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import Bot from './Bot';
import * as pdfjsLib from 'pdfjs-dist';
const pdfjsWorker = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

import { saveAs } from 'file-saver';

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
                    console.log('URl is:', url);
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

    async function handleDataFromChild(data) {
        console.log('Data received from child:', data);

        

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