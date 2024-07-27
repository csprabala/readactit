import React from "react";
import brandingImage from './Customer-Logo.png';

const Navbar = () => {
    return (
      <nav className="bg-gray-500 p-0" style={{ height: '60px' }}>
        <div className="container mx-auto flex items-center justify-between" style={{ height: '100%', padding: '0', margin: '0' }}>
          <img src={brandingImage} alt="Brand" className="h-full object-contain" style={{ maxHeight: '60%', margin: '10', padding: '0' }} />
          <ul className="flex space-x-4">
            <li><a href="#home" className="text-white">Home</a></li>
            <li><a href="#about" className="text-white">About</a></li>
            <li><a href="#contact" className="text-white">Contact</a></li>
          </ul>
        </div>
      </nav>
    );
  };
  
  export default Navbar;