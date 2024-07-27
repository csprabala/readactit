import React from 'react';
import PdfViewer from './PdfViewer';
import Navbar from './Navbar';
import './index.css';
import PdfLibViewer from './PdfLibViewer';

const App = () => {
  return <>
  <Navbar />
  <br/>
  <PdfViewer />
  {/* <PdfLibViewer /> */}
  </>
};

export default App;
