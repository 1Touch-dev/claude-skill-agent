import React from 'react';

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="app-footer">
      <p>© {year} Enterprise Claude Skills Platform</p>
    </footer>
  );
}

export default Footer;