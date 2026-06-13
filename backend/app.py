"""
SecureVault — Flask REST API
────────────────────────────
Endpoints
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me
  POST   /api/auth/logout
  PUT    /api/auth/change-password

  GET    /api/files
  POST   /api/files/upload
  GET    /api/files/<id>/download
  DELETE /api/files/<id>
  POST   /api/files/<id>/encrypt
  POST   /api/files/<id>/decrypt
  POST   /api/files/<id>/share
  DELETE /api/files/<id>/share
  GET    /api/shared/<token>
  GET    /api/logs
"""

import os, secrets, logging, importlib.util
from datetime import datetime, timedelta, timezone
from functools import wraps

import bcrypt
import jwt
from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename

# ══════════════════════════════════════════════════════════════════════════
#  CONFIG
# ══════════════════════════════════════════════════════════════════════════
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
LOG_DIR     = os.path.join(BASE_DIR, "logs")
LOG_FILE    = os.path.join(LOG_DIR,  "activity.log")

os.makedirs(UPLOAD_ROOT, exist_ok=True)
os.makedirs(LOG_DIR,     exist_ok=True)

ALLOWED_EXTENSIONS = {
    "txt","pdf","png","jpg","jpeg","gif","bmp","webp",
    "docx","xlsx","pptx","doc","xls",
    "zip","tar","gz","7z",
    "mp4","mp3","wav",
    "csv","json","xml",
    "enc"
}

MAX_FILE_MB = 50
JWT_HOURS   = 2

# ── Load crypto_utils from same folder ────────────────────────────────────
def _load_crypto():
    path = os.path.join(BASE_DIR, "crypto_utils.py")
    if not os.path.isfile(path):
        return False
    try:
        spec = importlib.util.spec_from_file_location("crypto_utils", path)
        mod  = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        global encrypt_file, decrypt_file
        encrypt_file = mod.encrypt_file
        decrypt_file = mod.decrypt_file
        return True
    except Exception:
        return False

CRYPTO_AVAILABLE = _load_crypto()

# ══════════════════════════════════════════════════════════════════════════
#  APP
# ══════════════════════════════════════════════════════════════════════════
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

app.config.update(
    SECRET_KEY                     = os.environ.get("SECRET_KEY", secrets.token_hex(32)),
    SQLALCHEMY_DATABASE_URI        = os.environ.get("DATABASE_URL",
                                       f"sqlite:///{os.path.join(BASE_DIR, 'securevault.db')}"),
    SQLALCHEMY_TRACK_MODIFICATIONS = False,
    MAX_CONTENT_LENGTH             = MAX_FILE_MB * 1024 * 1024,
)

db = SQLAlchemy(app)

logging.basicConfig(
    filename = LOG_FILE,
    level    = logging.INFO,
    format   = "%(asctime)s  [%(levelname)-8s]  %(message)s",
    datefmt  = "%Y-%m-%d %H:%M:%S",
)
activity = logging.getLogger("activity")

# ══════════════════════════════════════════════════════════════════════════
#  MODELS
# ══════════════════════════════════════════════════════════════════════════
class User(db.Model):
    __tablename__ = "users"
    id            = db.Column(db.Integer,     primary_key=True)
    full_name     = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at    = db.Column(db.DateTime,    default=datetime.utcnow)
    files         = db.relationship("File", backref="owner", lazy=True,
                                    cascade="all, delete-orphan")

    def to_dict(self):
        return {"id": self.id, "full_name": self.full_name,
                "email": self.email,
                "created_at": self.created_at.isoformat()}


class File(db.Model):
    __tablename__ = "files"
    id            = db.Column(db.Integer,     primary_key=True)
    original_name = db.Column(db.String(256), nullable=False)
    stored_name   = db.Column(db.String(256), nullable=False)
    size          = db.Column(db.Integer,     default=0)
    encrypted     = db.Column(db.Boolean,     default=False)
    share_token   = db.Column(db.String(64),  unique=True, nullable=True)
    uploaded_at   = db.Column(db.DateTime,    default=datetime.utcnow)
    user_id       = db.Column(db.Integer,     db.ForeignKey("users.id"), nullable=False)

    def to_dict(self):
        return {
            "id":            self.id,
            "original_name": self.original_name,
            "size":          self.size,
            "size_fmt":      _fmt_size(self.size),
            "encrypted":     self.encrypted,
            "shared":        self.share_token is not None,
            "uploaded_at":   self.uploaded_at.isoformat(),
        }


class TokenBlacklist(db.Model):
    __tablename__ = "token_blacklist"
    id         = db.Column(db.Integer,    primary_key=True)
    jti        = db.Column(db.String(64), unique=True, nullable=False)
    revoked_at = db.Column(db.DateTime,   default=datetime.utcnow)

# ══════════════════════════════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════════════════════════════
def _fmt_size(n):
    for unit in ("B","KB","MB","GB"):
        if n < 1024: return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"

def _allowed(filename):
    return ("." in filename and
            filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS)

def _user_folder(user_id):
    path = os.path.join(UPLOAD_ROOT, str(user_id))
    os.makedirs(path, exist_ok=True)
    return path

def _make_token(user):
    jti = secrets.token_hex(16)
    payload = {
        "user_id":   user.id,
        "email":     user.email,
        "full_name": user.full_name,
        "jti":       jti,
        "exp":       datetime.now(timezone.utc) + timedelta(hours=JWT_HOURS),
        "iat":       datetime.now(timezone.utc),
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")

def _decode_token(token):
    return jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])

def _get_own_file(file_id):
    record = db.session.get(File, file_id)
    if record is None:
        abort(404)
    if record.user_id != request.current_user.id:
        abort(403)
    return record

def ok(data=None, message=None, status=200):
    body = {}
    if message:          body["message"] = message
    if data is not None: body["data"]    = data
    return jsonify(body), status

def err(message, status=400):
    return jsonify({"error": message}), status

# ── Auth decorator ────────────────────────────────────────────────────────
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization header missing"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = _decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token has expired. Please log in again."}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token."}), 401

        if TokenBlacklist.query.filter_by(jti=payload.get("jti", "")).first():
            return jsonify({"error": "Token has been revoked. Please log in again."}), 401

        user = db.session.get(User, payload["user_id"])
        if not user:
            return jsonify({"error": "User not found."}), 401

        request.current_user = user
        return f(*args, **kwargs)
    return decorated

# ══════════════════════════════════════════════════════════════════════════
#  AUTH ROUTES
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/auth/register", methods=["POST"])
def register():
    body      = request.get_json(silent=True) or {}
    full_name = (body.get("full_name") or "").strip()
    email     = (body.get("email")     or "").strip().lower()
    password  = (body.get("password")  or "")

    if not full_name or not email or not password:
        return err("full_name, email, and password are all required.")
    if len(password) < 8:
        return err("Password must be at least 8 characters.")
    if "@" not in email or "." not in email.split("@")[-1]:
        return err("Invalid email address.")
    if User.query.filter_by(email=email).first():
        return err("Email is already registered.", 409)

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    user    = User(full_name=full_name, email=email, password_hash=pw_hash)
    db.session.add(user)
    db.session.commit()

    activity.info(f"REGISTER  user_id={user.id}  email={email}")
    token = _make_token(user)
    return ok({"token": token, "user": user.to_dict()}, "Account created successfully.", 201)


@app.route("/api/auth/login", methods=["POST"])
def login():
    body     = request.get_json(silent=True) or {}
    email    = (body.get("email")    or "").strip().lower()
    password = (body.get("password") or "")

    if not email or not password:
        return err("Email and password are required.")

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        activity.warning(f"FAILED_LOGIN  email={email}  ip={request.remote_addr}")
        return err("Invalid email or password.", 401)

    token = _make_token(user)
    activity.info(f"LOGIN  user_id={user.id}  email={email}")
    return ok({"token": token, "user": user.to_dict()}, "Login successful.")


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    return ok(request.current_user.to_dict())


@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    token   = request.headers.get("Authorization", "").split(" ", 1)[1]
    payload = _decode_token(token)
    jti     = payload.get("jti", "")
    if jti and not TokenBlacklist.query.filter_by(jti=jti).first():
        db.session.add(TokenBlacklist(jti=jti))
        db.session.commit()
    activity.info(f"LOGOUT  user_id={request.current_user.id}")
    return ok(message="Logged out successfully.")


@app.route("/api/auth/change-password", methods=["PUT"])
@require_auth
def change_password():
    body         = request.get_json(silent=True) or {}
    old_password = (body.get("old_password") or "")
    new_password = (body.get("new_password") or "")

    user = request.current_user
    if not bcrypt.checkpw(old_password.encode(), user.password_hash.encode()):
        return err("Current password is incorrect.", 403)
    if len(new_password) < 8:
        return err("New password must be at least 8 characters.")

    user.password_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
    db.session.commit()
    activity.info(f"PASSWORD_CHANGED  user_id={user.id}")
    return ok(message="Password updated successfully.")

# ══════════════════════════════════════════════════════════════════════════
#  FILE ROUTES
# ══════════════════════════════════════════════════════════════════════════
@app.route("/api/files", methods=["GET"])
@require_auth
def list_files():
    q    = (request.args.get("q") or "").strip()
    sort = request.args.get("sort", "date")

    query = File.query.filter_by(user_id=request.current_user.id)
    if q:
        query = query.filter(File.original_name.ilike(f"%{q}%"))

    order_map = {
        "name": File.original_name.asc(),
        "size": File.size.desc(),
        "date": File.uploaded_at.desc(),
    }
    query = query.order_by(order_map.get(sort, File.uploaded_at.desc()))
    return ok([f.to_dict() for f in query.all()])


@app.route("/api/files/upload", methods=["POST"])
@require_auth
def upload():
    if "file" not in request.files:
        return err("No file part in request.")
    f = request.files["file"]
    if f.filename == "":
        return err("No file selected.")
    if not _allowed(f.filename):
        return err(f"File type not allowed.")

    user        = request.current_user
    safe_name   = secure_filename(f.filename)
    stored_name = f"{int(datetime.utcnow().timestamp())}_{safe_name}"
    dest_path   = os.path.join(_user_folder(user.id), stored_name)
    f.save(dest_path)
    size = os.path.getsize(dest_path)

    record = File(original_name=f.filename, stored_name=stored_name,
                  size=size, user_id=user.id)
    db.session.add(record)
    db.session.commit()
    activity.info(f"UPLOAD  user_id={user.id}  file={f.filename}  size={_fmt_size(size)}")
    return ok(record.to_dict(), "File uploaded successfully.", 201)


@app.route("/api/files/<int:file_id>/download", methods=["GET"])
@require_auth
def download(file_id):
    record = _get_own_file(file_id)
    return send_from_directory(_user_folder(record.user_id), record.stored_name,
                               as_attachment=True, download_name=record.original_name)


@app.route("/api/files/<int:file_id>", methods=["DELETE"])
@require_auth
def delete_file(file_id):
    record = _get_own_file(file_id)
    path   = os.path.join(_user_folder(record.user_id), record.stored_name)
    if os.path.isfile(path):
        os.remove(path)
    name = record.original_name
    db.session.delete(record)
    db.session.commit()
    activity.info(f"DELETE  user_id={request.current_user.id}  file={name}")
    return ok(message=f"'{name}' deleted successfully.")


@app.route("/api/files/<int:file_id>/encrypt", methods=["POST"])
@require_auth
def encrypt(file_id):
    if not CRYPTO_AVAILABLE:
        return err("crypto_utils not found on server.", 501)
    record = _get_own_file(file_id)
    if record.encrypted:
        return err("File is already encrypted.")

    password = (request.get_json(silent=True) or {}).get("password", "")
    if not password:
        return err("Password is required.")

    folder   = _user_folder(record.user_id)
    src      = os.path.join(folder, record.stored_name)
    enc_name = record.stored_name + ".enc"
    dst      = os.path.join(folder, enc_name)
    try:
        encrypt_file(src, dst, password)
        os.remove(src)
        record.stored_name = enc_name
        record.size        = os.path.getsize(dst)
        record.encrypted   = True
        db.session.commit()
        activity.info(f"ENCRYPT  user_id={record.user_id}  file={record.original_name}")
        return ok(record.to_dict(), "File encrypted successfully.")
    except Exception as e:
        activity.error(f"ENCRYPT_FAIL  user_id={record.user_id}  error={e}")
        return err(f"Encryption failed: {e}", 500)


@app.route("/api/files/<int:file_id>/decrypt", methods=["POST"])
@require_auth
def decrypt(file_id):
    if not CRYPTO_AVAILABLE:
        return err("crypto_utils not found on server.", 501)
    record = _get_own_file(file_id)
    if not record.encrypted:
        return err("File is not encrypted.")

    password = (request.get_json(silent=True) or {}).get("password", "")
    if not password:
        return err("Password is required.")

    folder   = _user_folder(record.user_id)
    src      = os.path.join(folder, record.stored_name)
    dec_name = record.stored_name[:-4] if record.stored_name.endswith(".enc") else record.stored_name + ".dec"
    dst      = os.path.join(folder, dec_name)
    try:
        decrypt_file(src, dst, password)
        os.remove(src)
        record.stored_name = dec_name
        record.size        = os.path.getsize(dst)
        record.encrypted   = False
        db.session.commit()
        activity.info(f"DECRYPT  user_id={record.user_id}  file={record.original_name}")
        return ok(record.to_dict(), "File decrypted successfully.")
    except Exception as e:
        activity.error(f"DECRYPT_FAIL  user_id={record.user_id}  error={e}")
        return err(f"Decryption failed: {e}", 500)


@app.route("/api/files/<int:file_id>/share", methods=["POST"])
@require_auth
def generate_share(file_id):
    record = _get_own_file(file_id)
    if not record.share_token:
        record.share_token = secrets.token_urlsafe(32)
        db.session.commit()
        activity.info(f"SHARE_CREATE  user_id={record.user_id}  file={record.original_name}")
    link = request.host_url + f"api/shared/{record.share_token}"
    return ok({"share_url": link}, "Share link generated.")


@app.route("/api/files/<int:file_id>/share", methods=["DELETE"])
@require_auth
def revoke_share(file_id):
    record = _get_own_file(file_id)
    record.share_token = None
    db.session.commit()
    activity.info(f"SHARE_REVOKE  user_id={record.user_id}  file={record.original_name}")
    return ok(message="Share link revoked.")


@app.route("/api/shared/<token>", methods=["GET"])
def shared_download(token):
    record = File.query.filter_by(share_token=token).first_or_404()
    return send_from_directory(_user_folder(record.user_id), record.stored_name,
                               as_attachment=True, download_name=record.original_name)


@app.route("/api/logs", methods=["GET"])
@require_auth
def get_logs():
    user_id = str(request.current_user.id)
    lines   = []
    try:
        with open(LOG_FILE, "r") as fh:
            all_lines = fh.readlines()
        lines = [l.rstrip() for l in all_lines
                 if f"user_id={user_id}" in l][-100:]
    except FileNotFoundError:
        pass
    return ok(lines)

# ══════════════════════════════════════════════════════════════════════════
#  ERROR HANDLERS
# ══════════════════════════════════════════════════════════════════════════
@app.errorhandler(404)
def not_found(e):      return err("Resource not found.", 404)

@app.errorhandler(405)
def method_not_allowed(e): return err("Method not allowed.", 405)

@app.errorhandler(413)
def too_large(e):      return err(f"File exceeds the {MAX_FILE_MB} MB limit.", 413)

@app.errorhandler(500)
def server_error(e):   return err("Internal server error.", 500)

# ══════════════════════════════════════════════════════════════════════════
#  STARTUP
# ══════════════════════════════════════════════════════════════════════════
with app.app_context():
    db.create_all()

if __name__ == "__main__":
    app.run(debug=True, port=5000)