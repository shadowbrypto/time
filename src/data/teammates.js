// Teammates data with timezone information
// UTC offsets are in hours (e.g., -5 for EST, +5.5 for IST)

export const teammates = [
  // Founder
  {
    id: 4,
    name: "Reethmos",
    role: "Founder",
    timezone: "Dubai",
    utcOffset: 4,
    avatar: "/assets/avatars/reethmos.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // COO
  {
    id: 1,
    name: "Gambloor",
    role: "COO",
    timezone: "New York",
    utcOffset: -4,
    avatar: "/assets/avatars/gambloor.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // PM
  {
    id: 2,
    name: "Redux",
    role: "Operations & PM", 
    timezone: "Zurich",
    utcOffset: 2,
    avatar: "/assets/avatars/redux.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // Art Director
  {
    id: 11,
    name: "Mark",
    role: "Art Director",
    timezone: "France",
    utcOffset: +2,
    avatar: "/assets/avatars/mark.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 6,
    name: "Tejma",
    role: "UI/UX Designer",
    timezone: "UK",
    utcOffset: 0,
    avatar: "/assets/avatars/tejma.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // BD
  {
    id: 3,
    name: "Boom",
    role: "BD",
    timezone: "Hawaii",
    utcOffset: -10,
    avatar: "/assets/avatars/boom.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 5,
    name: "Trancey",
    role: "BD",
    timezone: "Los Angeles",
    utcOffset: -7,
    avatar: "/assets/avatars/trancey.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 7,
    name: "Gabi",
    role: "BD",
    timezone: "Argentina",
    utcOffset: -3,
    avatar: "/assets/avatars/gabi.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 10,
    name: "Dust",
    role: "BD",
    timezone: "Bulgaria",
    utcOffset: +3,
    avatar: "/assets/avatars/dust.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 13,
    name: "Jason",
    role: "BD",
    timezone: "New York",
    utcOffset: -4,
    avatar: "/assets/avatars/jason.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // PR
  {
    id: 9,
    name: "Silo",
    role: "PR",
    timezone: "America",
    utcOffset: -5,
    avatar: "/assets/avatars/silo.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 14,
    name: "Shyla",
    role: "PR",
    timezone: "UK",
    utcOffset: 0,
    avatar: "/assets/avatars/shyla.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  // Support
  {
    id: 8,
    name: "Keats",
    role: "Support",
    timezone: "New York",
    utcOffset: -4,
    avatar: "/assets/avatars/keats.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  },
  {
    id: 12,
    name: "Cali",
    role: "Support",
    timezone: "Poland",
    utcOffset: +2,
    avatar: "/assets/avatars/cali.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  }
];

// Utility functions for timezone handling
export const getTeammateLocalTime = (teammate) => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const teammateTime = new Date(utc + (teammate.utcOffset * 3600000));
  return teammateTime;
};

export const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
};

export const isWithinWorkingHours = (teammate) => {
  const localTime = getTeammateLocalTime(teammate);
  const currentHour = localTime.getHours();
  const currentMinute = localTime.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  const [startHour, startMinute] = teammate.workingHours.start.split(':').map(Number);
  const [endHour, endMinute] = teammate.workingHours.end.split(':').map(Number);
  
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  
  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
};

export const getOnlineStatus = (teammate) => {
  return isWithinWorkingHours(teammate) ? "online" : "offline";
};

export const getTimezoneAbbreviation = (timezone) => {
  const abbreviations = {
    "America/New_York": "EST",
    "Asia/Kolkata": "IST", 
    "Europe/London": "GMT",
    "Asia/Tokyo": "JST",
    "America/Los_Angeles": "PST",
    "Australia/Sydney": "AEDT"
  };
  return abbreviations[timezone] || timezone;
};

// Add new teammate function
export const addTeammate = (teammate) => {
  const newTeammate = {
    ...teammate,
    id: Math.max(...teammates.map(t => t.id)) + 1,
    status: "offline"
  };
  teammates.push(newTeammate);
  return newTeammate;
};

// Update teammate function
export const updateTeammate = (id, updates) => {
  const index = teammates.findIndex(t => t.id === id);
  if (index !== -1) {
    teammates[index] = { ...teammates[index], ...updates };
    return teammates[index];
  }
  return null;
};