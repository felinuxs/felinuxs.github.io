# gen-cert.ps1 — Genera certificado HTTPS auto-firmado para JAM POS Sync
$cert = New-SelfSignedCertificate `
    -DnsName "localhost","127.0.0.1" `
    -FriendlyName "JAM POS Sync" `
    -NotAfter (Get-Date).AddYears(5) `
    -HashAlgorithm SHA256 `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeyUsage DigitalSignature,KeyEncipherment `
    -Type SSLServerAuthentication
$pfxPassword = ConvertTo-SecureString -String "jampos2027" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath (Join-Path $PSScriptRoot "cert.pfx") -Password $pfxPassword | Out-Null
Write-Host "  cert.pfx generado OK" -ForegroundColor Green
