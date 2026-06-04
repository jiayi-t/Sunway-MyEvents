export default function Footer() {
  return (
    <footer className="mt-auto bg-primary px-4 py-6 text-center">
      <div className="text-lg font-bold mb-2">
        <span className="text-white">Sunway </span>
        <span className="text-accent">MyEvents</span>
      </div>

      <p className="text-blue-200 text-xs">© 2026 Sunway Education Group</p>

      <div className="mt-1 text-blue-200 text-xs">
        <div>Owned & Governed by Jeffrey Cheah Foundation (800946-T)</div>
        <div className="mt-1">
          <a
            href="https://sunway.edu.my/personal-data-protection-notice-for-sunway-education-group"
            target="_blank"
            rel="noopener noreferrer"
            className="underline mr-2"
          >
            PDPA (English)
          </a>
          <a
            href="https://sunway.edu.my/notis-perlindungan-data-peribadi-bagi-sunway-education-group"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            PDPA (BM)
          </a>
        </div>
      </div>
    </footer>
  )
}