// src/components/IpDetails.jsx
import { useEffect, useState } from "react";

export default function IpDetails({ data, onClose }) {
  const [flagEmoji, setFlagEmoji] = useState("");

  useEffect(() => {
    if (data?.country_code) {
      // Convert country code (e.g., "US") to flag emoji
      const codePoints = data.country_code
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
      setFlagEmoji(String.fromCodePoint(...codePoints));
    }
  }, [data]);

  if (!data) return null;

  const {
    ip,
    country,
    country_code,
    region,
    city,
    org,
    asn,
    timezone,
    latitude,
    longitude,
  } = data;

  const hasGeo =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    !Number.isNaN(latitude) &&
    !Number.isNaN(longitude);

  let mapSrc = "";
  if (hasGeo) {
    const lat = latitude;
    const lon = longitude;
    const delta = 0.5;
    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
    mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
  }

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-box" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h3>
            {flagEmoji} {ip}
          </h3>
          <button className="btn-icon btn-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="popup-grid">
          <div>
            <b>Country</b>
            <div>{country || "—"}</div>
          </div>
          <div>
            <b>Region</b>
            <div>{region || "—"}</div>
          </div>
          <div>
            <b>City</b>
            <div>{city || "—"}</div>
          </div>
          <div>
            <b>Organization</b>
            <div>{org || "—"}</div>
          </div>
          <div>
            <b>ASN</b>
            <div>{asn || "—"}</div>
          </div>
          <div>
            <b>Timezone</b>
            <div>{timezone || "—"}</div>
          </div>
        </div>

        {hasGeo && (
          <div className="popup-map">
            <iframe
              title="ip-location"
              src={mapSrc}
              style={{ border: 0, width: "100%", height: "100%" }}
              loading="lazy"
            />
          </div>
        )}

        <div className="popup-footer">
          <button className="btn secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}