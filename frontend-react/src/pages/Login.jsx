import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import Footer from "../components/Footer";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) { setError("All fields are required."); return; }
    setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("token",     res.data.data.token);
      localStorage.setItem("full_name", res.data.data.user.full_name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid email or password.");
    } finally { setLoading(false); }
  };

  const features = [
    { icon:"👤", title:"User Registration and Login",   desc:"Users can create an account and securely log in with hashed passwords and JWT session tokens." },
    { icon:"⬆",  title:"File Upload",                   desc:"Users can upload sensitive documents to their personal dashboard. Supports PDF, images, documents and more." },
    { icon:"📁", title:"File Explorer",                 desc:"Uploaded files are displayed in a clean file explorer view with search, sort, and filter capabilities." },
    { icon:"🔒", title:"File Encryption",               desc:"Users can encrypt files using password-based AES-GCM encryption with PBKDF2-SHA256 key derivation." },
    { icon:"🔓", title:"File Decryption",               desc:"Encrypted files can only be decrypted with the correct password. The password is never stored on the server." },
    { icon:"🔗", title:"File Sharing",                  desc:"Users can generate a secure share link for selected files. Anyone with the link can download the file." },
    { icon:"🚫", title:"Revoke Sharing",                desc:"Users can disable a shared link at any time when it is no longer needed, instantly blocking access." },
    { icon:"🗑", title:"Delete Files",                  desc:"Users can permanently remove files from their account. Deleted files are immediately removed from the server." },
    { icon:"📋", title:"Activity Logs",                 desc:"The system records important user actions such as upload, encryption, decryption, sharing, and deletion." },
  ];

  const faqs = [
    { q:"Q1.  What is SecureVault?",                          a:"SecureVault is a secure web application that allows users to upload, encrypt, decrypt, share, and manage files." },
    { q:"Q2.  Who can use SecureVault?",                      a:"Any regular user who wants to protect sensitive files such as IDs, university documents, financial records, or personal files." },
    { q:"Q3.  Can anyone open my encrypted file?",            a:"No. Encrypted files can only be decrypted with the correct password." },
    { q:"Q4.  What happens if I forget my encryption password?", a:"The file cannot be decrypted without the correct password. This is because SecureVault does not store encryption passwords." },
    { q:"Q5.  Are account passwords stored safely?",          a:"Yes. Account passwords are hashed using bcrypt before being stored in the database." },
    { q:"Q6.  What encryption does SecureVault use?",         a:"SecureVault uses AES-GCM encryption with PBKDF2-SHA256 key derivation." },
    { q:"Q7.  Can I share files?",                            a:"Yes. Users can generate a share link for a file and revoke it later." },
    { q:"Q8.  Can I delete files?",                           a:"Yes. Users can delete uploaded files from their account at any time." },
    { q:"Q9.  Is this a cloud storage system?",               a:"It works like a basic secure storage system, but for this capstone version files are stored locally on the server." },
    { q:"Q10. Is SecureVault a final commercial product?",    a:"No. It is an educational capstone project designed to demonstrate secure file management and encryption concepts." },
  ];

  return (
    <div className="sv-page">
      <div className="sv-bg-circle sv-bg-circle-1"/>
      <div className="sv-bg-circle sv-bg-circle-2"/>
      <div className="sv-bg-circle sv-bg-circle-3"/>

      <nav className={`sv-nav ${scrolled ? "sv-nav-scrolled" : ""}`}>
        <div className="sv-nav-logo">
          <img src="/logo.png" alt="SecureVault" style={{width:32,height:32,objectFit:"contain"}}/>
          <span className="sv-logo-text">SecureVault</span>
        </div>
        <div className="sv-nav-links">
          <button className="sv-nav-link sv-nav-btn-link" onClick={() => scrollTo("features-section")}>Features</button>
          <button className="sv-nav-link sv-nav-btn-link" onClick={() => scrollTo("faq-section")}>FAQ</button>
        </div>
        <Link to="/register" className="sv-nav-cta">Get started free</Link>
      </nav>

      <div className="sv-content">
        <div className="sv-hero">
          <div className="sv-hero-badge"><span>🛡</span> Military-grade AES-256 Encryption</div>
          <h1 className="sv-hero-title">Secure your files<br/>with confidence</h1>
          <p className="sv-hero-sub">Encrypt, share, and manage sensitive files with AES-GCM encryption and PBKDF2 key derivation. Your data stays yours — always.</p>
          <div className="sv-trust-row">
            {[
              {icon:"🔒",title:"AES-256-GCM",  sub:"Encryption"},
              {icon:"🔑",title:"PBKDF2-SHA256", sub:"Key Derivation"},
              {icon:"🎲",title:"Random Salt",   sub:"Per Operation"},
            ].map(t=>(
              <div key={t.title} className="sv-trust-item">
                <span className="sv-trust-icon">{t.icon}</span>
                <div>
                  <div className="sv-trust-title">{t.title}</div>
                  <div className="sv-trust-sub">{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sv-card">
          <div className="sv-card-header">
            <h2 className="sv-card-title">Welcome back</h2>
            <p className="sv-card-sub">Sign in to your account</p>
          </div>
          {error && <div className="sv-error">{error}</div>}
          <form onSubmit={submit} className="sv-form">
            <div className="sv-field">
              <label className="sv-label">Email address</label>
              <input className="sv-input" type="email" name="email"
                placeholder="you@example.com" value={form.email}
                onChange={handle} autoFocus/>
            </div>
            <div className="sv-field">
              <label className="sv-label">Password</label>
              <div className="sv-input-row">
                <input className="sv-input" type={showPw ? "text" : "password"}
                  name="password" placeholder="Enter your password"
                  value={form.password} onChange={handle}/>
                <button type="button" className="sv-toggle-btn"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            <button className="sv-submit" type="submit" disabled={loading}>
              {loading ? <span className="sv-spinner"/> : <><span>Sign in</span><span>→</span></>}
            </button>
          </form>
          <div className="sv-divider"><span>New to SecureVault?</span></div>
          <Link to="/register" className="sv-alt-btn">Create a free account</Link>
        </div>
      </div>

      {/* FEATURES */}
      <div id="features-section" className="sv-landing-section">
        <div className="sv-landing-inner">
          <div className="sv-section-badge">✨ Features</div>
          <h2 className="sv-landing-title">What SecureVault can do</h2>
          <p className="sv-landing-sub">SecureVault provides a complete secure file management system for users.</p>
          <div className="sv-features-grid">
            {features.map((f, i) => (
              <div key={i} className="sv-feature-card">
                <div className="sv-feature-card-icon">{f.icon}</div>
                <div className="sv-feature-card-title">{f.title}</div>
                <div className="sv-feature-card-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div id="faq-section" className="sv-landing-section sv-faq-bg">
        <div className="sv-landing-inner sv-landing-narrow">
          <div className="sv-section-badge">❓ FAQ</div>
          <h2 className="sv-landing-title">Frequently Asked Questions</h2>
          <p className="sv-landing-sub">Everything you need to know about SecureVault.</p>
          <div className="sv-faq-list">
            {faqs.map((item, i) => (
              <div key={i} className="sv-faq-item">
                <button className="sv-faq-question"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{item.q}</span>
                  <span className="sv-faq-icon">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <div className="sv-faq-answer">{item.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer dark={false}/>
    </div>
  );
}
