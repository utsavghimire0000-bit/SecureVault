import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import Footer from "../components/Footer";

function fmtSize(n) {
  const u = ["B","KB","MB","GB"]; let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}
function fileExt(name) {
  return name.includes(".") ? name.split(".").pop().toUpperCase() : "FILE";
}

function Modal({ title, sub, onClose, children }) {
  return (
    <div className="dm-overlay" onClick={onClose}>
      <div className="dm-box" onClick={e => e.stopPropagation()}>
        <div className="dm-header">
          <h3 className="dm-title">{title}</h3>
          <button className="dm-close" onClick={onClose}>✕</button>
        </div>
        {sub && <p className="dm-sub">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function ChangePwModal({ onClose, flash }) {
  const [form, setForm] = useState({ old_password:"", new_password:"", confirm:"" });
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (!form.old_password || !form.new_password || !form.confirm) { setError("All fields are required."); return; }
    if (form.new_password !== form.confirm) { setError("Passwords do not match."); return; }
    if (form.new_password.length < 8) { setError("Minimum 8 characters."); return; }
    try {
      await API.put("/auth/change-password", { old_password: form.old_password, new_password: form.new_password });
      flash("Password changed successfully."); onClose();
    } catch (err) { setError(err.response?.data?.error || "Failed."); }
  };
  return (
    <Modal title="Change Password" onClose={onClose}>
      {error && <div className="dm-error">{error}</div>}
      <form onSubmit={submit}>
        {[["Current Password","old_password"],["New Password","new_password"],["Confirm New Password","confirm"]].map(([label,key]) => (
          <div key={key} className="dm-field">
            <label className="dm-label">{label}</label>
            <input className="dm-input" type="password" placeholder={label}
              value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}
              autoFocus={key==="old_password"}/>
          </div>
        ))}
        <div className="dm-btns">
          <button className="dm-btn-primary" type="submit">Update Password</button>
          <button className="dm-btn-ghost" type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const fileInput = useRef();
  const [page, setPage]       = useState("home");
  const [files, setFiles]     = useState([]);
  const [search, setSearch]   = useState("");
  const [sort, setSort]       = useState("date");
  const [alert, setAlert]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag]       = useState(false);
  const [logs, setLogs]       = useState([]);
  const [encModal, setEncModal]           = useState(null);
  const [decModal, setDecModal]           = useState(null);
  const [shareModal, setShareModal]       = useState(null);
  const [changePwModal, setChangePwModal] = useState(false);
  const [encPw, setEncPw] = useState("");
  const [decPw, setDecPw] = useState("");

  const user      = localStorage.getItem("full_name") || "User";
  const firstName = user.split(" ")[0];
  const initials  = user.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);

  const flash = (msg, type="success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const loadFiles = async () => {
    try { const res = await API.get(`/files?sort=${sort}`); setFiles(res.data.data || []); }
    catch { flash("Failed to load files.", "error"); }
  };
  const loadLogs = async () => {
    try { const res = await API.get("/logs"); setLogs(res.data.data || []); }
    catch { setLogs([]); }
  };

  useEffect(() => { loadFiles(); }, [sort]);
  useEffect(() => { if (page === "activity") loadLogs(); }, [page]);

  const filtered = files.filter(f => f.original_name.toLowerCase().includes(search.toLowerCase()));
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const encCount  = files.filter(f => f.encrypted).length;

  const uploadFile = async (file) => {
    if (!file) return;
    const form = new FormData(); form.append("file", file);
    setLoading(true);
    try {
      await API.post("/files/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      flash(`'${file.name}' uploaded successfully.`); loadFiles(); setPage("files");
    } catch (err) { flash(err.response?.data?.error || "Upload failed.", "error"); }
    finally { setLoading(false); }
  };
  const onFileChange = (e) => { uploadFile(e.target.files[0]); e.target.value = ""; };
  const onDrop = (e) => { e.preventDefault(); setDrag(false); uploadFile(e.dataTransfer.files[0]); };

  const download = async (file) => {
    try {
      const res = await API.get(`/files/${file.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a"); a.href = url; a.download = file.original_name; a.click();
      URL.revokeObjectURL(url);
    } catch { flash("Download failed.", "error"); }
  };

  const deleteFile = async (file) => {
    if (!confirm(`Delete '${file.original_name}'?`)) return;
    try { await API.delete(`/files/${file.id}`); flash(`'${file.original_name}' deleted.`); loadFiles(); }
    catch { flash("Delete failed.", "error"); }
  };

  const doEncrypt = async () => {
    if (!encPw) { flash("Password required.", "error"); return; }
    try { await API.post(`/files/${encModal.id}/encrypt`, { password: encPw }); flash("File encrypted successfully."); setEncModal(null); setEncPw(""); loadFiles(); }
    catch (err) { flash(err.response?.data?.error || "Encryption failed.", "error"); }
  };
  const doDecrypt = async () => {
    if (!decPw) { flash("Password required.", "error"); return; }
    try { await API.post(`/files/${decModal.id}/decrypt`, { password: decPw }); flash("File decrypted successfully."); setDecModal(null); setDecPw(""); loadFiles(); }
    catch (err) { flash(err.response?.data?.error || "Decryption failed.", "error"); }
  };
  const openShare = async (file) => {
    if (file.shared) { setShareModal({ ...file, url: "Revoke first to get a new link." }); return; }
    try { const res = await API.post(`/files/${file.id}/share`); setShareModal({ ...file, url: res.data.data.share_url }); }
    catch { flash("Share failed.", "error"); }
  };
  const revokeShare = async () => {
    try { await API.delete(`/files/${shareModal.id}/share`); flash("Share link revoked."); setShareModal(null); loadFiles(); }
    catch { flash("Revoke failed.", "error"); }
  };
  const copyLink = () => { navigator.clipboard.writeText(shareModal.url); flash("Link copied!"); };
  const logout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    localStorage.clear(); navigate("/");
  };

  const navSections = [
    { group: null, items: [{ id:"home", label:"Home" }] },
    { group: "FILE VAULT", items: [
      { id:"files",     label:"My Files",    badge: files.length > 0 ? files.length : null },
      { id:"upload",    label:"Upload File" },
      { id:"encrypted", label:"Encrypted",   badge: encCount > 0 ? encCount : null, badgeGreen: true },
    ]},
    { group: "ACCOUNT", items: [
      { id:"activity", label:"Activity Log" },
      { id:"settings", label:"Settings" },
    ]},
  ];

  const FileTable = ({ data, emptyTitle="No files", emptySub="Upload a file to get started" }) => (
    <div className="dm-table-wrap">
      {data.length === 0 ? (
        <div className="dm-empty">
          <p className="dm-empty-title">{emptyTitle}</p>
          <p className="dm-empty-sub">{emptySub}</p>
        </div>
      ) : (
        <table className="dm-table">
          <thead>
            <tr>
              <th>File Name</th><th>Type</th><th>Size</th>
              <th>Status</th><th>Date</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(f => (
              <tr key={f.id}>
                <td><span className="dm-fname">{f.original_name}</span></td>
                <td><span className="dm-ext">{fileExt(f.original_name)}</span></td>
                <td className="dm-muted">{f.size_fmt}</td>
                <td>
                  {f.encrypted
                    ? <span className="dm-badge dm-badge-enc">Encrypted</span>
                    : <span className="dm-badge dm-badge-plain">Plain</span>}
                </td>
                <td className="dm-muted">{f.uploaded_at.slice(0,10)}</td>
                <td>
                  <div className="dm-acts">
                    <button className="dm-act" onClick={() => download(f)}>Download</button>
                    {f.encrypted
                      ? <button className="dm-act dm-act-green" onClick={() => { setDecModal(f); setDecPw(""); }}>Decrypt</button>
                      : <button className="dm-act dm-act-teal" onClick={() => { setEncModal(f); setEncPw(""); }}>Encrypt</button>}
                    <button className="dm-act" style={f.shared?{color:"#0d3d36",borderColor:"#0d3d36"}:{}}
                      onClick={() => openShare(f)}>Share</button>
                    <button className="dm-act dm-act-red" onClick={() => deleteFile(f)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderContent = () => {
    switch (page) {

      case "home": return (
        <div className="dm-content">
          <div className="dm-page-header">
            <div>
              <h1 className="dm-page-title">Dashboard</h1>
              <p className="dm-page-sub">Welcome back, {firstName} 👋</p>
            </div>
            <button className="dm-btn-primary" onClick={() => fileInput.current.click()} disabled={loading}>
              {loading ? "Uploading…" : "Upload File"}
            </button>
          </div>

          <div className="dm-stats">
            <div className="dm-stat">
              <p className="dm-stat-label">Total Files</p>
              <p className="dm-stat-value">{files.length}</p>
            </div>
            <div className="dm-stat">
              <p className="dm-stat-label">Encrypted</p>
              <p className="dm-stat-value dm-stat-accent">{encCount}</p>
            </div>
            <div className="dm-stat">
              <p className="dm-stat-label">Storage Used</p>
              <p className="dm-stat-value">{fmtSize(totalSize)}</p>
            </div>
          </div>

          <p className="dm-section-label">Quick Actions</p>
          <div className="dm-quick">
            <button className="dm-quick-btn" onClick={() => fileInput.current.click()}>Upload File</button>
            <button className="dm-quick-btn" onClick={() => setPage("files")}>Browse Files</button>
            {encCount > 0 && <button className="dm-quick-btn" onClick={() => setPage("encrypted")}>Encrypted ({encCount})</button>}
          </div>

          <p className="dm-section-label" style={{marginTop:28}}>Recent Files</p>
          {files.length === 0 ? (
            <div className="dm-empty-card">
              <p className="dm-empty-title">Your vault is empty</p>
              <p className="dm-empty-sub">Upload a file to get started.</p>
              <button className="dm-btn-primary" style={{marginTop:14}} onClick={() => fileInput.current.click()}>Upload your first file</button>
            </div>
          ) : (
            <>
              <FileTable data={files.slice(0,5)}/>
              {files.length > 5 && (
                <button className="dm-view-all" onClick={() => setPage("files")}>View all {files.length} files →</button>
              )}
            </>
          )}
        </div>
      );

      case "files": return (
        <div className="dm-content">
          <div className="dm-page-header">
            <div>
              <h1 className="dm-page-title">My Files</h1>
              <p className="dm-page-sub">{files.length} file{files.length!==1?"s":""} · {fmtSize(totalSize)}</p>
            </div>
            <button className="dm-btn-primary" onClick={() => fileInput.current.click()} disabled={loading}>
              {loading ? "Uploading…" : "Upload File"}
            </button>
          </div>
          <div className="dm-toolbar">
            <input className="dm-search" type="text" placeholder="Search files…"
              value={search} onChange={e => setSearch(e.target.value)}/>
            <select className="dm-sort" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="date">Date</option>
              <option value="name">Name</option>
              <option value="size">Size</option>
            </select>
          </div>
          <FileTable data={filtered} emptyTitle="No files found"
            emptySub={search ? "Try a different search term" : "Upload a file to get started"}/>
        </div>
      );

      case "upload": return (
        <div className="dm-content">
          <div className="dm-page-header">
            <div>
              <h1 className="dm-page-title">Upload File</h1>
              <p className="dm-page-sub">Add a file to your secure vault</p>
            </div>
          </div>
          <div className={`dm-drop ${drag ? "dm-drop-active" : ""}`}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current.click()}>
            <p className="dm-drop-title">{drag ? "Drop your file here" : "Drag & drop or click to browse"}</p>
            <p className="dm-drop-sub">PDF, images, documents, archives and more · Max 50 MB</p>
            <button className="dm-btn-primary" style={{marginTop:16}}
              onClick={e => { e.stopPropagation(); fileInput.current.click(); }}
              disabled={loading}>{loading ? "Uploading…" : "Choose File"}</button>
          </div>
          <div className="dm-types">
            {["PDF","Images","Documents","Spreadsheets","Archives","Audio","Video","Text"].map(t => (
              <span key={t} className="dm-type-tag">{t}</span>
            ))}
          </div>
        </div>
      );

      case "encrypted": return (
        <div className="dm-content">
          <div className="dm-page-header">
            <div>
              <h1 className="dm-page-title">Encrypted Files</h1>
              <p className="dm-page-sub">{encCount} encrypted file{encCount!==1?"s":""}</p>
            </div>
          </div>
          <FileTable data={files.filter(f => f.encrypted)}
            emptyTitle="No encrypted files yet"
            emptySub="Upload a file and encrypt it to keep it secure."/>
        </div>
      );

      case "activity": return (
        <div className="dm-content">
          <div className="dm-page-header">
            <div>
              <h1 className="dm-page-title">Activity Log</h1>
              <p className="dm-page-sub">Your recent vault activity</p>
            </div>
          </div>
          <div className="dm-log-wrap">
            {logs.length === 0 ? (
              <div className="dm-empty" style={{padding:40}}>
                <p className="dm-empty-title">No activity yet</p>
                <p className="dm-empty-sub">Actions like uploads and encryptions will appear here.</p>
              </div>
            ) : logs.map((line, i) => {
              const type = line.includes("ENCRYPT")?"enc":line.includes("DECRYPT")?"dec":line.includes("UPLOAD")?"up":line.includes("DELETE")?"del":"info";
              const labels = { enc:"Encrypt", dec:"Decrypt", up:"Upload", del:"Delete", info:"Event" };
              return (
                <div key={i} className="dm-log-row">
                  <span className={`dm-log-tag dm-log-${type}`}>{labels[type]}</span>
                  <span className="dm-log-text">{line}</span>
                </div>
              );
            })}
          </div>
        </div>
      );

      case "settings": return (
        <div className="dm-content">
          <div className="dm-page-header">
            <div>
              <h1 className="dm-page-title">Settings</h1>
              <p className="dm-page-sub">Manage your account</p>
            </div>
          </div>
          <div className="dm-settings-grid">
            <div className="dm-settings-card">
              <p className="dm-settings-title">Profile</p>
              <div className="dm-settings-rows">
                <div className="dm-settings-row"><span className="dm-settings-key">Name</span><span className="dm-settings-val">{user}</span></div>
                <div className="dm-settings-row"><span className="dm-settings-key">Status</span><span className="dm-settings-val" style={{color:"#166534"}}>Active</span></div>
                <div className="dm-settings-row"><span className="dm-settings-key">Files</span><span className="dm-settings-val">{files.length}</span></div>
              </div>
            </div>
            <div className="dm-settings-card dm-settings-card-click" onClick={() => setChangePwModal(true)}>
              <p className="dm-settings-title">Security</p>
              <div className="dm-settings-rows">
                <div className="dm-settings-row"><span className="dm-settings-key">Password</span><span className="dm-settings-val">••••••••</span></div>
                <div className="dm-settings-row"><span className="dm-settings-key">Encryption</span><span className="dm-settings-val">AES-256-GCM</span></div>
                <div className="dm-settings-row"><span className="dm-settings-key">Key Derivation</span><span className="dm-settings-val">PBKDF2-SHA256</span></div>
              </div>
              <button className="dm-settings-btn">Change Password</button>
            </div>
            <div className="dm-settings-card dm-settings-card-danger">
              <p className="dm-settings-title">Session</p>
              <p className="dm-settings-desc">You are currently signed in. Sign out to end your session.</p>
              <button className="dm-settings-btn dm-settings-btn-danger" onClick={logout}>Sign Out</button>
            </div>
          </div>
        </div>
      );

      default: return null;
    }
  };

  const activeLabel = navSections.flatMap(s => s.items).find(n => n.id === page)?.label || "Dashboard";

  return (
    <div className="dm-app">
      {/* Sidebar */}
      <aside className="dm-sidebar">
        <div className="dm-sidebar-top">
          <img src="/logo.png" alt="SecureVault" style={{width:32,height:32,objectFit:"contain"}}/>
          <span className="dm-brand">SecureVault</span>
        </div>
        <nav className="dm-nav">
          {navSections.map(({ group, items }) => (
            <div key={group||"main"} className="dm-nav-group">
              {group && <p className="dm-nav-group-label">{group}</p>}
              {items.map(item => (
                <button key={item.id}
                  className={`dm-nav-item ${page === item.id ? "dm-nav-active" : ""}`}
                  onClick={() => { if (item.id === "upload") fileInput.current.click(); else setPage(item.id); }}>
                  <span className="dm-nav-label">{item.label}</span>
                  {item.badge && (
                    <span className={`dm-nav-badge ${item.badgeGreen ? "dm-nav-badge-green" : ""}`}>{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="dm-sidebar-user">
          <div className="dm-avatar">{initials}</div>
          <div>
            <p className="dm-user-name">{user}</p>
            <p className="dm-user-role">Vault Member</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="dm-main">
        <header className="dm-topbar">
          <span className="dm-topbar-title">{activeLabel}</span>
          <div className="dm-topbar-right">
            {alert && (
              <div className={`dm-toast ${alert.type === "error" ? "dm-toast-error" : "dm-toast-success"}`}>
                {alert.msg}
              </div>
            )}
            <button className="dm-signout" onClick={logout}>Sign out</button>
          </div>
        </header>

        <main className="dm-main-body">{renderContent()}</main>

        <footer className="dm-footer">
          <Footer dark={false}/>
        </footer>
      </div>

      <input ref={fileInput} type="file" style={{display:"none"}} onChange={onFileChange}/>

      {encModal && (
        <Modal title="Encrypt File" sub={encModal.original_name} onClose={() => setEncModal(null)}>
          <div className="dm-field"><label className="dm-label">Password</label>
            <input className="dm-input" type="password" placeholder="Encryption password"
              value={encPw} onChange={e => setEncPw(e.target.value)}
              autoFocus onKeyDown={e => e.key==="Enter"&&doEncrypt()}/></div>
          <div className="dm-btns">
            <button className="dm-btn-primary" onClick={doEncrypt}>Encrypt File</button>
            <button className="dm-btn-ghost" onClick={() => setEncModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {decModal && (
        <Modal title="Decrypt File" sub={decModal.original_name} onClose={() => setDecModal(null)}>
          <div className="dm-field"><label className="dm-label">Password</label>
            <input className="dm-input" type="password" placeholder="Decryption password"
              value={decPw} onChange={e => setDecPw(e.target.value)}
              autoFocus onKeyDown={e => e.key==="Enter"&&doDecrypt()}/></div>
          <div className="dm-btns">
            <button className="dm-btn-primary" onClick={doDecrypt}>Decrypt File</button>
            <button className="dm-btn-ghost" onClick={() => setDecModal(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {shareModal && (
        <Modal title="Share File" sub={shareModal.original_name} onClose={() => setShareModal(null)}>
          <p style={{fontSize:13,color:"#6b7280",marginBottom:10}}>Anyone with this link can download the file.</p>
          <div className="dm-share-row">
            <input className="dm-input" style={{fontFamily:"monospace",fontSize:12}} type="text" readOnly
              value={shareModal.url} onClick={e => e.target.select()}/>
            <button className="dm-btn-primary" onClick={copyLink}>Copy</button>
          </div>
          <div className="dm-btns" style={{marginTop:12}}>
            <button className="dm-btn-danger" onClick={revokeShare}>Revoke Link</button>
            <button className="dm-btn-ghost" onClick={() => setShareModal(null)}>Close</button>
          </div>
        </Modal>
      )}

      {changePwModal && <ChangePwModal onClose={() => setChangePwModal(false)} flash={flash}/>}
    </div>
  );
}
