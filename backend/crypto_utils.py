import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.exceptions import InvalidTag


SALT_SIZE = 16
NONCE_SIZE = 12
KEY_SIZE = 32
ITERATIONS = 390000


def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(password.encode())


def encrypt_file(input_path: str, output_path: str, password: str):
    salt = os.urandom(SALT_SIZE)
    nonce = os.urandom(NONCE_SIZE)

    key = derive_key(password, salt)
    aesgcm = AESGCM(key)

    with open(input_path, "rb") as file:
        file_data = file.read()

    encrypted_data = aesgcm.encrypt(nonce, file_data, None)

    with open(output_path, "wb") as file:
        file.write(salt + nonce + encrypted_data)


def decrypt_file(input_path: str, output_path: str, password: str):
    with open(input_path, "rb") as file:
        encrypted_file_data = file.read()

    salt = encrypted_file_data[:SALT_SIZE]
    nonce = encrypted_file_data[SALT_SIZE:SALT_SIZE + NONCE_SIZE]
    encrypted_data = encrypted_file_data[SALT_SIZE + NONCE_SIZE:]

    key = derive_key(password, salt)
    aesgcm = AESGCM(key)

    try:
        decrypted_data = aesgcm.decrypt(nonce, encrypted_data, None)
    except InvalidTag:
        raise ValueError("Wrong password or file has been modified/corrupted.")

    with open(output_path, "wb") as file:
        file.write(decrypted_data)