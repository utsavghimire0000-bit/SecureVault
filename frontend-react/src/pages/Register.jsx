import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../api";
import Footer from "../components/Footer";

function getStrength(pw) {
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[a-z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const colors = ["#e5e7eb","#ef4444","#ef4444","#f59e0b","#f59e0b","#22c55e"];
  const labels = ["","Weak","Weak","Medium","Medium","Strong"];
  return { score: s, color: colors[s], label: labels[s] };
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ full_name:"", email:"", password:"", confirm:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const strength = getStrength(form.password);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.full_name || !form.email || !form.password || !form.confirm) {
      setError("All fields are required."); return;
    }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await API.post("/auth/register", {
        full_name: form.full_name, email: form.email, password: form.password,
      });
      localStorage.setItem("token",     res.data.data.token);
      localStorage.setItem("full_name", res.data.data.user.full_name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="sv-page">
      <div className="sv-bg-circle sv-bg-circle-1"/>
      <div className="sv-bg-circle sv-bg-circle-2"/>
      <div className="sv-bg-circle sv-bg-circle-3"/>

      <nav className="sv-nav">
        <div className="sv-nav-logo">
          <span className="sv-logo-icon">🔐</span>
          <span className="sv-logo-text">SecureVault</span>
        </div>
        <div className="sv-nav-links">
          <a href="#" className="sv-nav-link">Features</a>
          <a href="#" className="sv-nav-link">Security</a>
          <a href="#" className="sv-nav-link">FAQ</a>
        </div>
        <Link to="/" className="sv-nav-cta sv-nav-cta-outline">Sign in</Link>
      </nav>

      <div className="sv-content">
        <div className="sv-hero">
          <div className="sv-hero-badge"><span>🚀</span> Free to get started</div>
          <h1 className="sv-hero-title">Protect what<br/>matters most</h1>
          <p className="sv-hero-sub">
            Join SecureVault and start encrypting your sensitive
            files with military-grade AES-256-GCM encryption today.
          </p>
          <div className="sv-feature-list">
            {[
              "AES-256-GCM encryption",
              "Secure file sharing with links",
              "Full activity logging",
              "Password-based key derivation",
              "No file size limits on local setup",
            ].map(f => (
              <div key={f} className="sv-feature-item">
                <span className="sv-check">✓</span>
                <span className="sv-feature-text">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sv-card">
          <div className="sv-card-header">
            <h2 className="sv-card-title">Create your account</h2>
            <p className="sv-card-sub">Free forever · No credit card required</p>
          </div>

          {error && <div className="sv-error">{error}</div>}

          <form onSubmit={submit} className="sv-form">
            <div className="sv-field">
              <label className="sv-label">Full name</label>
              <input className="sv-input" type="text" name="full_name"
                placeholder="Utshab" value={form.full_name} onChange={handle} autoFocus/>
            </div>
            <div className="sv-field">
              <label className="sv-label">Email address</label>
              <input className="sv-input" type="email" name="email"
                placeholder="utshab@example.com" value={form.email} onChange={handle}/>
            </div>
            <div className="sv-field">
              <label className="sv-label">Password</label>
              <div className="sv-input-row">
                <input className="sv-input" type={showPw ? "text" : "password"}
                  name="password" placeholder="Min 8 characters"
                  value={form.password} onChange={handle}/>
                <button type="button" className="sv-toggle-btn"
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
              {form.password && (
                <div className="sv-strength-row">
                  <div className="sv-strength-bars">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="sv-strength-bar"
                        style={{ background: i <= strength.score ? strength.color : "#e5e7eb" }}/>
                    ))}
                  </div>
                  <span style={{ fontSize:12, color: strength.color, fontWeight:600 }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>
            <div className="sv-field">
              <label className="sv-label">Confirm password</label>
              <input className="sv-input" type="password" name="confirm"
                placeholder="Re-enter your password" value={form.confirm} onChange={handle}/>
            </div>
            <button className="sv-submit" type="submit" disabled={loading}>
              {loading ? <span className="sv-spinner"/> : <><span>Create account</span><span>→</span></>}
            </button>
          </form>

          <div className="sv-divider"><span>Already have an account?</span></div>
          <Link to="/" className="sv-alt-btn">Sign in instead</Link>

          <p className="sv-terms">
            By registering you agree to our{" "}
            <a href="#" className="sv-terms-link">Terms of Use</a> and{" "}
            <a href="#" className="sv-terms-link">Privacy Policy</a>.
          </p>
        </div>
      </div>

      <Footer dark={false} />
    </div>
  );
}
