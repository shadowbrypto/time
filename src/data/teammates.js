// The team roster. Time maths lives in src/lib/time.js.
// `timezone` is an IANA zone name; offsets and daylight saving come from the browser.
// `contact` is the one place each person prefers to be reached:
// platform is "telegram", "slack" or "twitter" (shown as X).

export const teammates = [
  // Founder
  {
    id: 4,
    name: "Idris",
    contact: { platform: "telegram", handle: "idris_k" },
    role: "Founder",
    timezone: "Asia/Dubai",
    timezoneDisplay: "Dubai",
    avatar: "/assets/avatars/idris.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // COO
  {
    id: 1,
    name: "Nolan",
    contact: { platform: "telegram", handle: "nolan_ops" },
    role: "Operations & PM",
    timezone: "America/New_York",
    timezoneDisplay: "New York",
    avatar: "/assets/avatars/nolan.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // PM
  {
    id: 2,
    name: "Thabo",
    contact: { platform: "twitter", handle: "thabo_m" },
    role: "Operations & PM",
    timezone: "Africa/Johannesburg",
    timezoneDisplay: "South Africa",
    avatar: "/assets/avatars/thabo.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // Art Director
  {
    id: 11,
    name: "Lucien",
    contact: { platform: "twitter", handle: "lucien_art" },
    role: "Art Director",
    timezone: "Europe/Paris",
    timezoneDisplay: "France",
    avatar: "/assets/avatars/lucien.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 6,
    name: "Priya",
    contact: { platform: "slack", handle: "priya_ux" },
    role: "UI/UX Designer",
    timezone: "Europe/London",
    timezoneDisplay: "UK",
    avatar: "/assets/avatars/priya.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // BD
  {
    id: 3,
    name: "Kai",
    contact: { platform: "slack", handle: "kai_bd" },
    role: "BD",
    timezone: "Pacific/Honolulu",
    timezoneDisplay: "Hawaii",
    avatar: "/assets/avatars/kai.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 7,
    name: "Mateo",
    contact: { platform: "slack", handle: "mateo_r" },
    role: "BD",
    timezone: "America/Argentina/Buenos_Aires",
    timezoneDisplay: "Argentina",
    avatar: "/assets/avatars/mateo.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 10,
    name: "Viktor",
    contact: { platform: "telegram", handle: "viktor_bd" },
    role: "BD",
    timezone: "Europe/Sofia",
    timezoneDisplay: "Bulgaria",
    avatar: "/assets/avatars/viktor.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 13,
    name: "Darius",
    contact: { platform: "telegram", handle: "darius_n" },
    role: "BD",
    timezone: "America/New_York",
    timezoneDisplay: "New York",
    avatar: "/assets/avatars/darius.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 15,
    name: "Jonas",
    contact: { platform: "twitter", handle: "jonas_dash" },
    role: "Dashboard Guy",
    timezone: "Europe/Berlin",
    timezoneDisplay: "Munich",
    avatar: "/assets/avatars/jonas.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // PR
  {
    id: 9,
    name: "Wyatt",
    contact: { platform: "slack", handle: "wyatt_pr" },
    role: "PR",
    timezone: "America/Chicago",
    timezoneDisplay: "America",
    avatar: "/assets/avatars/wyatt.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 14,
    name: "Renee",
    contact: { platform: "telegram", handle: "renee_mkt" },
    role: "Marketing Team",
    timezone: "America/Vancouver",
    timezoneDisplay: "Vancouver",
    avatar: "/assets/avatars/renee.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // Support
  {
    id: 8,
    name: "Eliot",
    contact: { platform: "twitter", handle: "eliot_help" },
    role: "Support",
    timezone: "America/New_York",
    timezoneDisplay: "New York",
    avatar: "/assets/avatars/eliot.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 12,
    name: "Zofia",
    contact: { platform: "twitter", handle: "zofia_w" },
    role: "Support",
    timezone: "Europe/Warsaw",
    timezoneDisplay: "Poland",
    avatar: "/assets/avatars/zofia.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  }
];
