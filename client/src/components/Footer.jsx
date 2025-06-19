import React from 'react';
import './Footer.css';
import { FaInstagram } from 'react-icons/fa';
import { FaPalette } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="footer">      
    <div className="footer-right">
        <a href="https://www.instagram.com/stand.burg" target="_blank" rel="noopener noreferrer">
        <FaInstagram style={{ marginRight: '0.5rem' }} />
          Síguenos en Instagram
        </a>
      </div>
      <div className="footer-left">
        <a href="/avisos-legales">Desarrollado por Grupo 6
        <FaPalette style={{ marginRight: '0.5rem' }} />
        </a>
      </div>

    </footer>
  );
};

export default Footer;
