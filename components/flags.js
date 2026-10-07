// Bandera de cada país de la app (SVG en /public/flags, de country-flag-icons, MIT).
const FLAGS = {
  Panama: "pa", Mexico: "mx", Colombia: "co", Brazil: "br", Argentina: "ar", Chile: "cl", Peru: "pe",
  "Costa Rica": "cr", "Dominican Republic": "do", Guatemala: "gt", Ecuador: "ec", Uruguay: "uy",
  Paraguay: "py", Bolivia: "bo", Venezuela: "ve", Honduras: "hn", "El Salvador": "sv", Nicaragua: "ni",
};

export const flagSrc = (country) => `/flags/${FLAGS[country]}.svg`;
