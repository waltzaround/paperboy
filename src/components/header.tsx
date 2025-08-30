export function Header() {
  return (
    <header className="flex justify-between items-center">
      <a href="/" className="p-3 text-sm font-semibold">
        Paperboy
      </a>
      <div className="text-xs flex items-center gap-4">
        <a href="/about" className="p-4">
          About
        </a>
        <a
          href="https://www.parliament.nz/en/calendar"
          target="_blank"
          className="p-4"
        >
          Calendar
        </a>
        <a href="https://github.com/waltzaround/paperboy" className="p-4">
          Source Code
        </a>
      </div>
    </header>
  );
}
