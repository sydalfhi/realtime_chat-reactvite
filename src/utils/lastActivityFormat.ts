export function formatLastActivityID(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();

  const diffTime = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const optionsTime: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
  };
  const optionsDateTime: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  const optionsDay: Intl.DateTimeFormatOptions = {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  };

  // Hari ini
  if (diffDays === 0) {
    return `Terakhir dilihat hari ini, ${date.toLocaleTimeString(
      "id-ID",
      optionsTime
    )}`;
  }

  // Kemarin
  if (diffDays === 1) {
    return `Terakhir dilihat kemarin, ${date.toLocaleTimeString(
      "id-ID",
      optionsTime
    )}`;
  }

  // Dalam seminggu terakhir
  if (diffDays <= 7) {
    return `Terakhir dilihat ${date.toLocaleDateString("id-ID", optionsDay)}`;
  }

  // Lebih dari seminggu
  return `Terakhir dilihat ${date.toLocaleDateString(
    "id-ID",
    optionsDateTime
  )}`;
}
