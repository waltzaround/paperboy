import { useState } from "react";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <header className="relative">
      <div className="flex justify-between items-center">
        <a href="/" className="p-3 text-sm font-semibold">
          Paperboy
        </a>
        
        {/* Desktop Menu */}
        <div className="text-xs hidden md:flex items-center gap-4">
          <a href="/about" className="p-4 hover:text-blue-400 transition-colors">
            About
          </a>
          <a
            href="https://www.parliament.nz/en/calendar"
            target="_blank"
            className="p-4 hover:text-blue-400 transition-colors"
          >
            Calendar
          </a>
          <a 
            href="https://github.com/waltzaround/paperboy" 
            className="p-4 hover:text-blue-400 transition-colors"
          >
            Source Code
          </a>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <div className="w-6 h-6 flex flex-col justify-center items-center">
            <span
              className={`block w-5 h-0.5 bg-current transition-all duration-300 ${
                isMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'
              }`}
            />
            <span
              className={`block w-5 h-0.5 bg-current transition-all duration-300 ${
                isMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`block w-5 h-0.5 bg-current transition-all duration-300 ${
                isMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-gray-900 border-t border-gray-700 transition-all duration-300 ease-in-out ${
          isMenuOpen 
            ? 'opacity-100 visible transform translate-y-0' 
            : 'opacity-0 invisible transform -translate-y-2'
        }`}
      >
        <nav className="flex flex-col py-2">
          <a 
            href="/about" 
            className="px-6 py-3 text-sm hover:bg-gray-800 hover:text-blue-400 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            About
          </a>
          <a
            href="https://www.parliament.nz/en/calendar"
            target="_blank"
            className="px-6 py-3 text-sm hover:bg-gray-800 hover:text-blue-400 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Calendar
          </a>
          <a 
            href="https://github.com/waltzaround/paperboy" 
            className="px-6 py-3 text-sm hover:bg-gray-800 hover:text-blue-400 transition-colors"
            onClick={() => setIsMenuOpen(false)}
          >
            Source Code
          </a>
        </nav>
      </div>
    </header>
  );
}
