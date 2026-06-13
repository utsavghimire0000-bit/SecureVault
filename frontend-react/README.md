# SecureVault

## Secure File Encryption and Management Web Application

SecureVault is a secure web-based file management application developed for a Bachelor of Information Technology Capstone Project. The system allows users to register, log in, upload files, list files, encrypt files, decrypt files, share files, revoke sharing, and delete files.

The project demonstrates secure file handling using authentication, encrypted storage, password-based encryption, and activity logging.

---

## Project Overview

SecureVault was designed to help users protect sensitive files such as personal documents, academic files, financial records, identity documents, and other private data.

The system provides a simple web interface where users can upload and manage files. Files can be encrypted using AES-GCM encryption and decrypted only with the correct password.

---

## Main Features

- User registration
- User login
- JWT-based authentication
- User profile retrieval
- File upload
- File explorer / file listing
- File search and sorting
- AES-GCM file encryption
- File decryption using the correct password
- File download
- File sharing through secure share links
- Revoke shared links
- File deletion
- Activity logging
- Modern React frontend
- Flask REST API backend

---

## Security Features

### AES-GCM Encryption

SecureVault uses AES-GCM encryption to protect file content. AES-GCM provides confidentiality, integrity, and authentication.

### PBKDF2-SHA256 Key Derivation

User encryption passwords are converted into secure cryptographic keys using PBKDF2-SHA256.

### Random Salt

A random salt is generated during encryption to ensure that the same password does not always generate the same encryption key.

### Random Nonce

A random nonce is generated for each encryption process to make encryption output unique.

### bcrypt Password Hashing

Account passwords are hashed using bcrypt before being stored in the database. Plain-text passwords are never stored.

### JWT Authentication

After login, users receive a JWT token. This token is required to access protected routes such as file upload, encryption, decryption, sharing, and deletion.

### User-Based Access Control

Users can only access and manage their own uploaded files.

### Activity Logging

Important user actions such as registration, login, upload, encryption, decryption, sharing, and deletion are recorded in the activity log.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- HTML
- CSS

### Backend

- Python
- Flask
- Flask-CORS
- Flask-SQLAlchemy
- SQLite
- bcrypt
- PyJWT
- Cryptography library

### Development Tools

- Visual Studio Code
- Thunder Client
- PowerShell
- Google Chrome

---

## Project Structure

```text
securevault_web/
│
├── backend/
│   ├── app.py
│   ├── crypto_utils.py
│   ├── requirements.txt
│   ├── securevault.db
│   ├── uploads/
│   ├── logs/
│   └── venv/
│
└── frontend-react/
    ├── package.json
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── api.js
    │   ├── index.css
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       └── Dashboard.jsx
    └── public/
```

---

## Backend Setup

### Step 1: Open the Backend Folder

```bash
cd securevault_web/backend
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv
```

### Step 3: Activate Virtual Environment

For Windows PowerShell:

```bash
venv\Scripts\activate
```

If PowerShell blocks the command, run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```bash
venv\Scripts\activate
```

### Step 4: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 5: Run Backend Server

```bash
python app.py
```

The backend will run on:

```text
http://127.0.0.1:5000
```

---

## Frontend Setup

### Step 1: Open the Frontend Folder

```bash
cd securevault_web/frontend-react
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Run Frontend

```bash
npm run dev
```

The frontend will run on:

```text
http://localhost:5173
```

---

## API Endpoints

### Authentication Routes

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Log in user |
| GET | `/api/auth/me` | Get current user profile |
| POST | `/api/auth/logout` | Log out user |
| PUT | `/api/auth/change-password` | Change account password |

### File Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/files` | List uploaded files |
| POST | `/api/files/upload` | Upload a file |
| GET | `/api/files/<id>/download` | Download a file |
| POST | `/api/files/<id>/encrypt` | Encrypt a file |
| POST | `/api/files/<id>/decrypt` | Decrypt a file |
| POST | `/api/files/<id>/share` | Generate a share link |
| DELETE | `/api/files/<id>/share` | Revoke a share link |
| DELETE | `/api/files/<id>` | Delete a file |
| GET | `/api/shared/<token>` | Public shared file download |
| GET | `/api/logs` | View activity logs |

---

## How to Use SecureVault

### 1. Register

Create an account using name, email, and password.

### 2. Login

Log in using registered email and password.

### 3. Upload File

Upload a file from the dashboard.

### 4. View Files

Uploaded files appear in the file explorer.

### 5. Encrypt File

Select a file and enter an encryption password. The system encrypts the file using AES-GCM.

### 6. Decrypt File

Enter the same password used for encryption. If the password is correct, the original file is restored.

### 7. Share File

Generate a share link for a selected file.

### 8. Revoke Share

Disable the share link when it is no longer needed.

### 9. Delete File

Remove the file from the system.

---

## Testing Summary

The following features were tested successfully:

| Test Case | Result |
|---|---|
| User Registration | Pass |
| User Login | Pass |
| JWT Authentication | Pass |
| Get User Profile | Pass |
| File Upload | Pass |
| File Listing | Pass |
| File Encryption | Pass |
| File Decryption | Pass |
| File Sharing | Pass |
| Revoke Share Link | Pass |
| File Deletion | Pass |
| Activity Logging | Pass |

---

## Example Workflow

```text
User registers
      ↓
User logs in
      ↓
JWT token is generated
      ↓
User uploads a file
      ↓
File metadata is stored in SQLite
      ↓
User encrypts the file
      ↓
AES-GCM protects the file content
      ↓
User decrypts the file with the correct password
      ↓
User can share, revoke share, or delete the file
```

---

## Educational Purpose

SecureVault was created as an academic capstone project to demonstrate practical cybersecurity concepts, including secure authentication, cryptographic file protection, access control, and secure file management.

This project is intended for learning and demonstration purposes. Additional security hardening would be required before using it as a production commercial system.

---

## Limitations

- Files are stored locally on the server.
- The system currently uses SQLite for development.
- Multi-factor authentication is not included.
- Cloud storage integration is not included.
- Advanced admin controls are not included.
- Production deployment configuration is not included.

---

## Future Improvements

Future enhancements may include:

- Multi-factor authentication
- Admin dashboard
- Cloud storage integration
- Secure file shredding
- Password reset by email
- File version history
- User storage quota
- Audit dashboard
- Production deployment with HTTPS
- PostgreSQL database support

---

## Developer

**Name:** Utshab Ghimire  
**Email:** utshab.ghimire@live.vu.edu.au  
**Project:** SecureVault Secure File Encryption and Management Web Application  
**Purpose:** Bachelor of Cybersecurity Capstone Project

---

## Conclusion

SecureVault successfully demonstrates a complete secure file management workflow. It combines user authentication, encrypted file storage, file sharing, activity logging, and a modern web interface. The project shows how cybersecurity principles can be applied to protect sensitive user files in a practical web application.
