'use client';
import { useEffect, useState } from 'react';
export function CookiePreferences() {
  const [saved, setSaved] = useState(false);
  return (
    <section className="panel" style={{ padding: 23, marginTop: 20 }}>
      <h2>Cookie preferences</h2>
      <p>
        Essential authentication cookies are required to provide the signed-in workspace. No
        optional analytics or advertising cookies are used.
      </p>
      <label className="between">
        <span>Essential cookies</span>
        <input type="checkbox" checked disabled aria-label="Essential cookies always active" />
      </label>
      <div style={{ marginTop: 20 }}>
        <button
          className="btn primary"
          onClick={() => {
            localStorage.setItem(
              'relay-cookie-preferences',
              JSON.stringify({
                essential: true,
                analytics: false,
                marketing: false,
                savedAt: new Date().toISOString(),
              }),
            );
            setSaved(true);
          }}
        >
          Save preferences
        </button>
        {saved && (
          <p role="status" style={{ marginTop: 10 }}>
            Preferences saved. Optional tracking remains off.
          </p>
        )}
      </div>
    </section>
  );
}
