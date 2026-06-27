export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function getCurrencySymbol(code: string | undefined | null): string {
  if (!code) return "$";
  const item = CURRENCIES.find((c) => c.value.toUpperCase() === code.toUpperCase());
  if (!item) return "$";
  const match = item.label.match(/\(([^)]+)\)/);
  return match ? match[1] : "$";
}

export const CATEGORIES: DropdownOption[] = [
  { value: "beauty_salon", label: "Beauty Salon" },
  { value: "barbershop", label: "Barbershop" },
  { value: "medical_clinic", label: "Medical Clinic" },
  { value: "tutoring", label: "Tutoring" },
  { value: "fitness_coaching", label: "Fitness Coaching" },
  { value: "repair_services", label: "Repair Services" },
  { value: "photography", label: "Photography" },
  { value: "other", label: "Other Category" },
];

export const SYSTEM_ROLES: DropdownOption[] = [
  { value: "staff", label: "Staff", sublabel: "Standard Scheduling/Access" },
  { value: "admin", label: "Admin", sublabel: "Manage Business & Catalog" },
  { value: "owner", label: "Owner", sublabel: "Full Business Control" },
];

export const TIMEZONES: DropdownOption[] = [
  // Global / Neutral
  { value: "UTC", label: "Coordinated Universal Time (UTC)", sublabel: "GMT / UTC+00:00" },
  { value: "GMT", label: "Greenwich Mean Time (GMT)", sublabel: "Europe/London / UTC+00:00" },

  // Europe
  { value: "Europe/London", label: "London (GMT/BST)", sublabel: "United Kingdom / UTC+00:00" },
  { value: "Europe/Dublin", label: "Dublin (GMT/IST)", sublabel: "Ireland / UTC+00:00" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)", sublabel: "France / UTC+01:00" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)", sublabel: "Germany / UTC+01:00" },
  { value: "Europe/Rome", label: "Rome (CET/CEST)", sublabel: "Italy / UTC+01:00" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)", sublabel: "Spain / UTC+01:00" },
  { value: "Europe/Brussels", label: "Brussels (CET/CEST)", sublabel: "Belgium / UTC+01:00" },
  { value: "Europe/Amsterdam", label: "Amsterdam (CET/CEST)", sublabel: "Netherlands / UTC+01:00" },
  { value: "Europe/Zurich", label: "Zurich (CET/CEST)", sublabel: "Switzerland / UTC+01:00" },
  { value: "Europe/Vienna", label: "Vienna (CET/CEST)", sublabel: "Austria / UTC+01:00" },
  { value: "Europe/Prague", label: "Prague (CET/CEST)", sublabel: "Czech Republic / UTC+01:00" },
  { value: "Europe/Warsaw", label: "Warsaw (CET/CEST)", sublabel: "Poland / UTC+01:00" },
  { value: "Europe/Athens", label: "Athens (EET/EEST)", sublabel: "Greece / UTC+02:00" },
  { value: "Europe/Helsinki", label: "Helsinki (EET/EEST)", sublabel: "Finland / UTC+02:00" },
  { value: "Europe/Stockholm", label: "Stockholm (CET/CEST)", sublabel: "Sweden / UTC+01:00" },
  { value: "Europe/Oslo", label: "Oslo (CET/CEST)", sublabel: "Norway / UTC+01:00" },
  { value: "Europe/Copenhagen", label: "Copenhagen (CET/CEST)", sublabel: "Denmark / UTC+01:00" },
  { value: "Europe/Istanbul", label: "Istanbul (TRT)", sublabel: "Turkey / UTC+03:00" },
  { value: "Europe/Moscow", label: "Moscow (MSK)", sublabel: "Russia / UTC+03:00" },
  { value: "Europe/Kiev", label: "Kyiv (EET/EEST)", sublabel: "Ukraine / UTC+02:00" },

  // North America
  { value: "America/New_York", label: "New York (EST/EDT)", sublabel: "US Eastern Time / UTC-05:00" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)", sublabel: "US Central Time / UTC-06:00" },
  { value: "America/Denver", label: "Denver (MST/MDT)", sublabel: "US Mountain Time / UTC-07:00" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)", sublabel: "US Pacific Time / UTC-08:00" },
  { value: "America/Phoenix", label: "Phoenix (MST)", sublabel: "Arizona (No DST) / UTC-07:00" },
  { value: "America/Anchorage", label: "Anchorage (AKST/AKDT)", sublabel: "Alaska Time / UTC-09:00" },
  { value: "America/Honolulu", label: "Honolulu (HST)", sublabel: "Hawaii Time / UTC-10:00" },
  { value: "America/Toronto", label: "Toronto (EST/EDT)", sublabel: "Canada Eastern / UTC-05:00" },
  { value: "America/Vancouver", label: "Vancouver (PST/PDT)", sublabel: "Canada Pacific / UTC-08:00" },
  { value: "America/Mexico_City", label: "Mexico City (CST/CDT)", sublabel: "Mexico / UTC-06:00" },

  // South America
  { value: "America/Sao_Paulo", label: "São Paulo (BRT)", sublabel: "Brazil / UTC-03:00" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (ART)", sublabel: "Argentina / UTC-03:00" },
  { value: "America/Bogota", label: "Bogota (COT)", sublabel: "Colombia / UTC-05:00" },
  { value: "America/Lima", label: "Lima (PET)", sublabel: "Peru / UTC-05:00" },
  { value: "America/Santiago", label: "Santiago (CLT/CLST)", sublabel: "Chile / UTC-04:00" },
  { value: "America/Caracas", label: "Caracas (VET)", sublabel: "Venezuela / UTC-04:00" },

  // Middle East & Africa
  { value: "Asia/Dubai", label: "Dubai (GST)", sublabel: "United Arab Emirates / UTC+04:00" },
  { value: "Asia/Riyadh", label: "Riyadh (AST)", sublabel: "Saudi Arabia / UTC+03:00" },
  { value: "Asia/Jerusalem", label: "Jerusalem (IST/IDT)", sublabel: "Israel / UTC+02:00" },
  { value: "Asia/Baghdad", label: "Baghdad (AST)", sublabel: "Iraq / UTC+03:00" },
  { value: "Asia/Tehran", label: "Tehran (IRST/IRDT)", sublabel: "Iran / UTC+03:30" },
  { value: "Africa/Cairo", label: "Cairo (EET/EEST)", sublabel: "Egypt / UTC+02:00" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)", sublabel: "South Africa / UTC+02:00" },
  { value: "Africa/Lagos", label: "Lagos (WAT)", sublabel: "Nigeria / UTC+01:00" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)", sublabel: "Kenya / UTC+03:00" },
  { value: "Africa/Casablanca", label: "Casablanca (WET/WEST)", sublabel: "Morocco / UTC+01:00" },

  // Asia
  { value: "Asia/Kolkata", label: "Kolkata (IST)", sublabel: "India / UTC+05:30" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", sublabel: "Singapore / UTC+08:00" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", sublabel: "Hong Kong / UTC+08:00" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", sublabel: "Japan / UTC+09:00" },
  { value: "Asia/Seoul", label: "Seoul (KST)", sublabel: "South Korea / UTC+09:00" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", sublabel: "China / UTC+08:00" },
  { value: "Asia/Taipei", label: "Taipei (CST)", sublabel: "Taiwan / UTC+08:00" },
  { value: "Asia/Bangkok", label: "Bangkok (ICT)", sublabel: "Thailand / UTC+07:00" },
  { value: "Asia/Jakarta", label: "Jakarta (WIB)", sublabel: "Indonesia / UTC+07:00" },
  { value: "Asia/Manila", label: "Manila (PHT)", sublabel: "Philippines / UTC+08:00" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur (MYT)", sublabel: "Malaysia / UTC+08:00" },
  { value: "Asia/Karachi", label: "Karachi (PKT)", sublabel: "Pakistan / UTC+05:00" },
  { value: "Asia/Dhaka", label: "Dhaka (BST)", sublabel: "Bangladesh / UTC+06:00" },
  { value: "Asia/Tashkent", label: "Tashkent (UZT)", sublabel: "Uzbekistan / UTC+05:00" },
  { value: "Asia/Kathmandu", label: "Kathmandu (NPT)", sublabel: "Nepal / UTC+05:45" },

  // Oceania
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", sublabel: "Australia Eastern / UTC+10:00" },
  { value: "Australia/Melbourne", label: "Melbourne (AEST/AEDT)", sublabel: "Australia Eastern / UTC+10:00" },
  { value: "Australia/Brisbane", label: "Brisbane (AEST)", sublabel: "Queensland (No DST) / UTC+10:00" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)", sublabel: "Australia Central / UTC+09:30" },
  { value: "Australia/Perth", label: "Perth (AWST)", sublabel: "Western Australia / UTC+08:00" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", sublabel: "New Zealand / UTC+12:00" },
  { value: "Pacific/Fiji", label: "Fiji (FJT)", sublabel: "Fiji / UTC+12:00" },
];

export const CURRENCIES: DropdownOption[] = [
  { value: "USD", label: "US Dollar ($)", sublabel: "United States" },
  { value: "EUR", label: "Euro (€)", sublabel: "Eurozone Countries" },
  { value: "GBP", label: "British Pound (£)", sublabel: "United Kingdom" },
  { value: "JPY", label: "Japanese Yen (¥)", sublabel: "Japan" },
  { value: "CAD", label: "Canadian Dollar ($)", sublabel: "Canada" },
  { value: "AUD", label: "Australian Dollar ($)", sublabel: "Australia" },
  { value: "CHF", label: "Swiss Franc (CHF)", sublabel: "Switzerland / Liechtenstein" },
  { value: "CNY", label: "Chinese Yuan (¥)", sublabel: "China" },
  { value: "HKD", label: "Hong Kong Dollar ($)", sublabel: "Hong Kong" },
  { value: "NZD", label: "New Zealand Dollar ($)", sublabel: "New Zealand / Cook Islands" },
  { value: "SGD", label: "Singapore Dollar ($)", sublabel: "Singapore" },
  { value: "INR", label: "Indian Rupee (₹)", sublabel: "India" },
  { value: "AED", label: "UAE Dirham (Dh)", sublabel: "United Arab Emirates" },
  { value: "SAR", label: "Saudi Riyal (SR)", sublabel: "Saudi Arabia" },
  { value: "ILS", label: "Israeli New Shekel (₪)", sublabel: "Israel / Palestinian Territories" },
  { value: "BRL", label: "Brazilian Real (R$)", sublabel: "Brazil" },
  { value: "RUB", label: "Russian Ruble (₽)", sublabel: "Russia" },
  { value: "ZAR", label: "South African Rand (R)", sublabel: "South Africa / Lesotho / Namibia" },
  { value: "TRY", label: "Turkish Lira (₺)", sublabel: "Turkey" },
  { value: "MXN", label: "Mexican Peso ($)", sublabel: "Mexico" },
  { value: "KWD", label: "Kuwaiti Dinar (KD)", sublabel: "Kuwait" },
  { value: "BHD", label: "Bahraini Dinar (BD)", sublabel: "Bahrain" },
  { value: "OMR", label: "Omani Rial (RO)", sublabel: "Oman" },
  { value: "QAR", label: "Qatari Riyal (QR)", sublabel: "Qatar" },
  { value: "PHP", label: "Philippine Peso (₱)", sublabel: "Philippines" },
  { value: "IDR", label: "Indonesian Rupiah (Rp)", sublabel: "Indonesia" },
  { value: "THB", label: "Thai Baht (฿)", sublabel: "Thailand" },
  { value: "MYR", label: "Malaysian Ringgit (RM)", sublabel: "Malaysia" },
  { value: "VND", label: "Vietnamese Dong (₫)", sublabel: "Vietnam" },
  { value: "COP", label: "Colombian Peso ($)", sublabel: "Colombia" },
  { value: "CLP", label: "Chilean Peso ($)", sublabel: "Chile" },
  { value: "PEN", label: "Peruvian Sol (S/.)", sublabel: "Peru" },
  { value: "ARS", label: "Argentine Peso ($)", sublabel: "Argentina" },
  { value: "NGN", label: "Nigerian Naira (₦)", sublabel: "Nigeria" },
  { value: "PKR", label: "Pakistani Rupee (₨)", sublabel: "Pakistan" },
  { value: "LKR", label: "Sri Lankan Rupee (Rs)", sublabel: "Sri Lanka" },
  { value: "BDT", label: "Bangladeshi Taka (৳)", sublabel: "Bangladesh" },
  { value: "EGP", label: "Egyptian Pound (E£)", sublabel: "Egypt" },
  { value: "MAD", label: "Moroccan Dirham (DH)", sublabel: "Morocco / Western Sahara" },
  { value: "PLN", label: "Polish Zloty (zł)", sublabel: "Poland" },
  { value: "CZK", label: "Czech Koruna (Kč)", sublabel: "Czech Republic" },
  { value: "HUF", label: "Hungarian Forint (Ft)", sublabel: "Hungary" },
  { value: "RON", label: "Romanian Leu (lei)", sublabel: "Romania" },
  { value: "UAH", label: "Ukrainian Hryvnia (₴)", sublabel: "Ukraine" },
  { value: "DKK", label: "Danish Krone (kr)", sublabel: "Denmark / Greenland" },
  { value: "NOK", label: "Norwegian Krone (kr)", sublabel: "Norway" },
  { value: "SEK", label: "Swedish Krona (kr)", sublabel: "Sweden" },
  { value: "TWD", label: "New Taiwan Dollar ($)", sublabel: "Taiwan" },
  { value: "KZT", label: "Kazakhstani Tenge (₸)", sublabel: "Kazakhstan" },
  { value: "KES", label: "Kenyan Shilling (Ksh)", sublabel: "Kenya" },
  { value: "GHS", label: "Ghanaian Cedi (GH₵)", sublabel: "Ghana" },
];
