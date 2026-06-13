import { useState } from "react";

// ── Reusable info modal ────────────────────────────────────
function InfoModal({ title, onClose, children }) {
  return (
    <div className="sv-modal-bg" onClick={onClose}>
      <div className="sv-modal sv-info-modal" onClick={e => e.stopPropagation()}>
        <div className="sv-modal-header">
          <h3 className="sv-modal-title">{title}</h3>
          <button className="sv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sv-info-body">{children}</div>
      </div>
    </div>
  );
}

// ── Footer with working links ──────────────────────────────
export default function Footer({ dark = false }) {
  const [modal, setModal] = useState(null);

  const linkClass = dark ? "sv-footer-link sv-footer-link-dark" : "sv-footer-link";

  return (
    <>
      <footer className={dark ? "sv-dash-footer" : "sv-footer"}>
        <span>© {new Date().getFullYear()} SecureVault. All rights reserved.</span>
        <div className="sv-footer-links">
          <button className={linkClass} onClick={() => setModal("privacy")}>Privacy Policy</button>
          <button className={linkClass} onClick={() => setModal("terms")}>Terms of Use</button>
          <button className={linkClass} onClick={() => setModal("security")}>Security</button>
          <button className={linkClass} onClick={() => setModal("contact")}>Contact</button>
        </div>
      </footer>

      {/* Privacy Policy */}
      {modal === "privacy" && (
        <InfoModal title="🔏 Privacy Policy" onClose={() => setModal(null)}>
          <p className="sv-info-updated">Last Updated: June 2026</p>
          <p className="sv-info-intro">SecureVault respects your privacy.</p>
          <ul className="sv-info-list">
            <li>We only collect information required for account authentication.</li>
            <li>Uploaded files remain under the user's full control.</li>
            <li>Passwords are securely hashed and never stored in plain text.</li>
            <li>Files are encrypted using AES encryption when encryption is enabled.</li>
            <li>We do not sell, share, or distribute user data to third parties.</li>
            <li>Users may delete their files at any time.</li>
          </ul>
          <p className="sv-info-note">By using SecureVault, you agree to this Privacy Policy.</p>
        </InfoModal>
      )}

      {/* Terms of Use */}
      {modal === "terms" && (
        <InfoModal title="📋 Terms of Use" onClose={() => setModal(null)}>
          <p className="sv-info-updated">Last Updated: June 2026</p>
          <p className="sv-info-intro">By using SecureVault, you agree to:</p>
          <ol className="sv-info-list sv-info-ordered">
            <li>Use the platform legally and responsibly.</li>
            <li>Not upload malicious, illegal, or harmful content.</li>
            <li>Maintain the confidentiality of your account credentials.</li>
            <li>Accept responsibility for files uploaded to your account.</li>
            <li>Understand that SecureVault is an educational capstone project and is provided "as is."</li>
          </ol>
          <p className="sv-info-note">SecureVault reserves the right to remove content that violates these terms.</p>
        </InfoModal>
      )}

      {/* Security */}
      {modal === "security" && (
        <InfoModal title="🛡 Security Information" onClose={() => setModal(null)}>
          <p className="sv-info-intro">SecureVault uses modern security practices including:</p>
          <div className="sv-security-list">
            {[
              { icon:"🔒", title:"AES-256-GCM Encryption",       desc:"Military-grade encryption for all protected files." },
              { icon:"🔑", title:"PBKDF2 Key Derivation",         desc:"Password-based key derivation with random salt per operation." },
              { icon:"🛡", title:"Password Hashing",              desc:"All passwords hashed with bcrypt — never stored in plain text." },
              { icon:"🔐", title:"JWT Authentication",            desc:"Secure session tokens with expiry and blacklist on logout." },
              { icon:"📁", title:"Access Control",                desc:"Users can only access their own files — strict ownership checks." },
              { icon:"🎲", title:"Random Salt & Nonce",           desc:"Unique salt and nonce generated per encryption operation." },
            ].map(s => (
              <div key={s.title} className="sv-security-item">
                <span className="sv-security-icon">{s.icon}</span>
                <div>
                  <div className="sv-security-title">{s.title}</div>
                  <div className="sv-security-desc">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="sv-info-note">We continuously work to improve the security of the platform.</p>
        </InfoModal>
      )}

      {/* Contact */}
      {modal === "contact" && (
        <InfoModal title="📬 Contact Us" onClose={() => setModal(null)}>
          <p className="sv-info-intro">For support, questions, or feedback regarding SecureVault:</p>
          <div className="sv-contact-box">
            <span className="sv-contact-icon">📧</span>
            <div>
              <div className="sv-contact-label">Email</div>
              <a href="mailto:utshab.ghimire@live.vu.edu.au" className="sv-contact-value">
                utshab.ghimire@live.vu.edu.au
              </a>
            </div>
          </div>
          <div className="sv-contact-box">
            <span className="sv-contact-icon">⏱</span>
            <div>
              <div className="sv-contact-label">Response Time</div>
              <div className="sv-contact-value">Within 24–48 hours</div>
            </div>
          </div>
          <p className="sv-info-note" style={{ marginTop:20 }}>
            SecureVault is a capstone project developed at Victoria University.
          </p>
        </InfoModal>
      )}
    </>
  );
}
