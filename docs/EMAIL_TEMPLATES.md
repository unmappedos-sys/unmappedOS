# Email Templates for Supabase Auth

Copy these templates to your Supabase Dashboard:
**Settings → Authentication → Email Templates**

---

## 1. Confirm Signup (Magic Link)

**Subject:** `🔐 UNMAPPED OS — Verify Your Identity`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.5">
  <title>Verify Identity - UNMAPPED OS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', monospace;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #0a0a0a; border: 1px solid #00ffff33;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; border-bottom: 1px solid #00ffff33;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #00ffff; font-size: 12px; letter-spacing: 3px;">▲ UNMAPPED OS</span>
                  </td>
                  <td align="right">
                    <span style="color: #666666; font-size: 10px;">SECURE TRANSMISSION</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td align="center" style="padding: 30px 30px 0;">
              <div style="display: inline-block; background-color: #00ffff15; border: 1px solid #00ffff; padding: 8px 20px;">
                <span style="color: #00ffff; font-size: 11px; letter-spacing: 2px;">IDENTITY VERIFICATION REQUIRED</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #888888; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
                OPERATIVE,
              </p>
              <p style="color: #cccccc; font-size: 13px; line-height: 1.6; margin: 0 0 25px;">
                A security clearance request has been initiated for your callsign. To complete identity verification and gain access to UNMAPPED OS command systems, authenticate using the secure link below.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00ffff22 0%, #00ffff11 100%); border: 1px solid #00ffff; color: #00ffff; text-decoration: none; padding: 14px 40px; font-size: 13px; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                      ▶ VERIFY IDENTITY
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Notice -->
              <div style="background-color: #111111; border-left: 3px solid #ff6600; padding: 15px; margin-bottom: 20px;">
                <p style="color: #ff6600; font-size: 10px; letter-spacing: 1px; margin: 0 0 5px;">⚠ SECURITY NOTICE</p>
                <p style="color: #888888; font-size: 11px; line-height: 1.5; margin: 0;">
                  This link expires in 24 hours. If you did not request access, disregard this transmission. Do not share this link.
                </p>
              </div>
              
              <!-- Manual Link -->
              <p style="color: #666666; font-size: 10px; line-height: 1.6; margin: 0;">
                If the button fails, copy this secure URL:<br>
                <span style="color: #00ffff; word-break: break-all;">{{ .ConfirmationURL }}</span>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #00ffff33; background-color: #050505;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #444444; font-size: 9px;">UNMAPPED OS v6.0</span>
                  </td>
                  <td align="right">
                    <span style="color: #444444; font-size: 9px;">FIELD INTELLIGENCE SYSTEMS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Magic Link (Login)

**Subject:** `🔐 UNMAPPED OS — Secure Access Link`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.5">
  <title>Secure Access - UNMAPPED OS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', monospace;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #0a0a0a; border: 1px solid #00ffff33;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; border-bottom: 1px solid #00ffff33;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #00ffff; font-size: 12px; letter-spacing: 3px;">▲ UNMAPPED OS</span>
                  </td>
                  <td align="right">
                    <span style="color: #666666; font-size: 10px;">ENCRYPTED CHANNEL</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td align="center" style="padding: 30px 30px 0;">
              <div style="display: inline-block; background-color: #00ff0015; border: 1px solid #00ff00; padding: 8px 20px;">
                <span style="color: #00ff00; font-size: 11px; letter-spacing: 2px;">ACCESS LINK READY</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #888888; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
                OPERATIVE,
              </p>
              <p style="color: #cccccc; font-size: 13px; line-height: 1.6; margin: 0 0 25px;">
                Your secure access link is ready. Click below to authenticate and enter the command center. This is a one-time use link.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #00ff0022 0%, #00ff0011 100%); border: 1px solid #00ff00; color: #00ff00; text-decoration: none; padding: 14px 40px; font-size: 13px; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                      ▶ ENTER COMMAND CENTER
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Info Box -->
              <div style="background-color: #111111; border-left: 3px solid #00ffff; padding: 15px; margin-bottom: 20px;">
                <p style="color: #00ffff; font-size: 10px; letter-spacing: 1px; margin: 0 0 5px;">ℹ INTEL</p>
                <p style="color: #888888; font-size: 11px; line-height: 1.5; margin: 0;">
                  Link valid for 1 hour. Single use only. If expired, request a new access link from the login portal.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #00ffff33; background-color: #050505;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #444444; font-size: 9px;">UNMAPPED OS v6.0</span>
                  </td>
                  <td align="right">
                    <span style="color: #444444; font-size: 9px;">FIELD INTELLIGENCE SYSTEMS</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 3. Password Reset

**Subject:** `🔐 UNMAPPED OS — Reset Security Credentials`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.5">
  <title>Reset Credentials - UNMAPPED OS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', monospace;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #0a0a0a; border: 1px solid #ff660033;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; border-bottom: 1px solid #ff660033;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #00ffff; font-size: 12px; letter-spacing: 3px;">▲ UNMAPPED OS</span>
                  </td>
                  <td align="right">
                    <span style="color: #ff6600; font-size: 10px;">SECURITY ALERT</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td align="center" style="padding: 30px 30px 0;">
              <div style="display: inline-block; background-color: #ff660015; border: 1px solid #ff6600; padding: 8px 20px;">
                <span style="color: #ff6600; font-size: 11px; letter-spacing: 2px;">CREDENTIAL RESET REQUESTED</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #888888; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
                OPERATIVE,
              </p>
              <p style="color: #cccccc; font-size: 13px; line-height: 1.6; margin: 0 0 25px;">
                A request to reset your security credentials has been received. If you initiated this request, proceed with the secure link below. Otherwise, your account may be compromised.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff660022 0%, #ff660011 100%); border: 1px solid #ff6600; color: #ff6600; text-decoration: none; padding: 14px 40px; font-size: 13px; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                      ▶ RESET CREDENTIALS
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Warning Box -->
              <div style="background-color: #1a0000; border-left: 3px solid #ff0000; padding: 15px; margin-bottom: 20px;">
                <p style="color: #ff0000; font-size: 10px; letter-spacing: 1px; margin: 0 0 5px;">⚠ WARNING</p>
                <p style="color: #888888; font-size: 11px; line-height: 1.5; margin: 0;">
                  If you did not request this reset, your credentials may be compromised. Secure your account immediately.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #ff660033; background-color: #050505;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #444444; font-size: 9px;">UNMAPPED OS v6.0</span>
                  </td>
                  <td align="right">
                    <span style="color: #444444; font-size: 9px;">SECURITY DIVISION</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 4. Email Change Confirmation

**Subject:** `🔐 UNMAPPED OS — Confirm New Callsign`

**Body (HTML):**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=0.5">
  <title>Confirm Email - UNMAPPED OS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: 'Courier New', monospace;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #0a0a0a; border: 1px solid #ff00ff33;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; border-bottom: 1px solid #ff00ff33;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="color: #00ffff; font-size: 12px; letter-spacing: 3px;">▲ UNMAPPED OS</span>
                  </td>
                  <td align="right">
                    <span style="color: #ff00ff; font-size: 10px;">IDENTITY UPDATE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Status Badge -->
          <tr>
            <td align="center" style="padding: 30px 30px 0;">
              <div style="display: inline-block; background-color: #ff00ff15; border: 1px solid #ff00ff; padding: 8px 20px;">
                <span style="color: #ff00ff; font-size: 11px; letter-spacing: 2px;">NEW CALLSIGN PENDING</span>
              </div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #888888; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
                OPERATIVE,
              </p>
              <p style="color: #cccccc; font-size: 13px; line-height: 1.6; margin: 0 0 25px;">
                A request to update your callsign (email) has been initiated. Confirm this change by clicking the secure link below.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff00ff22 0%, #ff00ff11 100%); border: 1px solid #ff00ff; color: #ff00ff; text-decoration: none; padding: 14px 40px; font-size: 13px; letter-spacing: 2px; font-family: 'Courier New', monospace;">
                      ▶ CONFIRM NEW CALLSIGN
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #ff00ff33; background-color: #050505;">
              <span style="color: #444444; font-size: 9px;">UNMAPPED OS v6.0 • IDENTITY SYSTEMS</span>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Setup Instructions

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Email Templates**
3. For each template type:
   - Paste the **Subject** line
   - Switch to **Source** mode (not WYSIWYG)
   - Paste the **HTML body**
4. Click **Save**

### Also configure:

**Authentication → URL Configuration:**
- Site URL: `http://localhost:3000` (dev) or your production URL
- Redirect URLs: Add `http://localhost:3000/auth/callback`

### Test the templates:
1. Sign up with a new email
2. Check inbox for themed email
3. Click link → should land on `/auth/callback` page
