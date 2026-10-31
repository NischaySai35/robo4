"""Certificates for encrypted links between GOS programs (TLS, both sides checked, like SROS2's keystore).

    gos certs new keys laptop robot     # keys/ca.pem plus a key and certificate for each name
    gos.App(transport='zenoh', listen=['tls/127.0.0.1:7447'], certs='keys', cert_name='robot')

Every program holds the shared ca.pem and its own NAME.pem + NAME.key. A program without a certificate signed by
this ca is refused, and everything sent is encrypted. Keep ca.key off the robot: it can make new certificates.
"""
import datetime, ipaddress, os

from .physics import GosError


def _need():
    try:
        from cryptography import x509
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec
        from cryptography.x509.oid import NameOID
        return x509, hashes, serialization, ec, NameOID
    except ImportError as e:
        raise GosError('Making certificates needs: py -3.12 -m pip install cryptography') from e


def new(folder, names, hosts=('localhost', '127.0.0.1'), days=825):
    """A certificate authority in folder (reused if there is one) and a certificate for each name, valid for these hosts."""
    x509, hashes, ser, ec, NameOID = _need()
    os.makedirs(folder, exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc)
    ca_key_path, ca_path = os.path.join(folder, 'ca.key'), os.path.join(folder, 'ca.pem')
    write = lambda p, data: open(p, 'wb').write(data)
    pem_key = lambda k: k.private_bytes(ser.Encoding.PEM, ser.PrivateFormat.PKCS8, ser.NoEncryption())
    if os.path.exists(ca_key_path):
        ca_key = ser.load_pem_private_key(open(ca_key_path, 'rb').read(), None)
        ca = x509.load_pem_x509_certificate(open(ca_path, 'rb').read())
    else:
        ca_key = ec.generate_private_key(ec.SECP256R1())
        name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'GOS certificate authority')])
        ca = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(ca_key.public_key())
              .serial_number(x509.random_serial_number()).not_valid_before(now - datetime.timedelta(minutes=5))
              .not_valid_after(now + datetime.timedelta(days=days))
              .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
              .sign(ca_key, hashes.SHA256()))
        write(ca_key_path, pem_key(ca_key)); write(ca_path, ca.public_bytes(ser.Encoding.PEM))
    sans = []
    for h in hosts:
        try: sans.append(x509.IPAddress(ipaddress.ip_address(h)))
        except ValueError: sans.append(x509.DNSName(h))
    for n in names:
        key = ec.generate_private_key(ec.SECP256R1())
        cert = (x509.CertificateBuilder().subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, n)]))
                .issuer_name(ca.subject).public_key(key.public_key()).serial_number(x509.random_serial_number())
                .not_valid_before(now - datetime.timedelta(minutes=5)).not_valid_after(now + datetime.timedelta(days=days))
                .add_extension(x509.SubjectAlternativeName(sans), critical=False)
                .sign(ca_key, hashes.SHA256()))
        write(os.path.join(folder, f'{n}.key'), pem_key(key)); write(os.path.join(folder, f'{n}.pem'), cert.public_bytes(ser.Encoding.PEM))
    return folder


def zenoh_tls(folder, name):
    """The Zenoh settings for this program's certificate, checked to exist first."""
    files = {'ca': os.path.join(folder, 'ca.pem'), 'cert': os.path.join(folder, f'{name}.pem'), 'key': os.path.join(folder, f'{name}.key')}
    missing = [p for p in files.values() if not os.path.exists(p)]
    if missing: raise GosError(f'Missing {", ".join(missing)}. Make them with: gos certs new {folder} {name}')
    return {
        'transport/link/tls/root_ca_certificate': files['ca'],
        'transport/link/tls/enable_mtls': True,
        'transport/link/tls/listen_private_key': files['key'], 'transport/link/tls/listen_certificate': files['cert'],
        'transport/link/tls/connect_private_key': files['key'], 'transport/link/tls/connect_certificate': files['cert'],
    }
