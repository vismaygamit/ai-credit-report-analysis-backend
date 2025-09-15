// isoToFullName.js
export function isoToFullName(code) {
  const languages = {
    en: "English",
    ru: "Русский",
    uk: "Українська",
    es: "Español",
    fr: "Français",
    hi: "हिंदी"
  };

  return languages[code] || code; // fallback: return code if not found
}

export default isoToFullName;
