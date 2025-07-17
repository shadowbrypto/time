// Teammates data with timezone information
// UTC offsets are in hours (e.g., -5 for EST, +5.5 for IST)

export const teammates = [
  // Founder
  {
    id: 4,
    name: "Reethmos",
    role: "Founder",
    timezone: "Asia/Dubai",
    timezoneDisplay: "Dubai",
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
    timezone: "America/New_York",
    timezoneDisplay: "New York",
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
    timezone: "Europe/Zurich",
    timezoneDisplay: "Zurich",
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
    timezone: "Europe/Paris",
    timezoneDisplay: "France",
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
    timezone: "Europe/London",
    timezoneDisplay: "UK",
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
    timezone: "Pacific/Honolulu",
    timezoneDisplay: "Hawaii",
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
    timezone: "America/Los_Angeles",
    timezoneDisplay: "Los Angeles",
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
    timezone: "America/Argentina/Buenos_Aires",
    timezoneDisplay: "Argentina",
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
    timezone: "Europe/Sofia",
    timezoneDisplay: "Bulgaria",
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
    timezone: "America/New_York",
    timezoneDisplay: "New York",
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
    timezone: "America/Chicago",
    timezoneDisplay: "America",
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
    timezone: "Europe/London",
    timezoneDisplay: "UK",
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
    timezone: "America/New_York",
    timezoneDisplay: "New York",
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
    timezone: "Europe/Warsaw",
    timezoneDisplay: "Poland",
    avatar: "/assets/avatars/cali.jpg",
    workingHours: {
      start: "08:00",
      end: "22:00"
    }
  }
];

// Utility functions for timezone handling with automatic DST support
export const getTeammateLocalTime = (teammate) => {
  const now = new Date();
  // Use Intl.DateTimeFormat to get accurate time in teammate's timezone
  // This automatically handles daylight saving time transitions
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: teammate.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(part => part.type === 'year').value);
  const month = parseInt(parts.find(part => part.type === 'month').value) - 1; // Month is 0-indexed
  const day = parseInt(parts.find(part => part.type === 'day').value);
  const hour = parseInt(parts.find(part => part.type === 'hour').value);
  const minute = parseInt(parts.find(part => part.type === 'minute').value);
  const second = parseInt(parts.find(part => part.type === 'second').value);
  
  return new Date(year, month, day, hour, minute, second);
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

// Get timezone abbreviation with DST awareness
export const getTimezoneAbbreviation = (timezone) => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  });
  
  const parts = formatter.formatToParts(now);
  const timeZoneName = parts.find(part => part.type === 'timeZoneName');
  return timeZoneName ? timeZoneName.value : timezone;
};

// Get current UTC offset for a timezone (handles DST automatically)
export const getCurrentUtcOffset = (timezone) => {
  const now = new Date();
  const utcTime = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const offsetMs = localTime.getTime() - utcTime.getTime();
  return offsetMs / (1000 * 60 * 60); // Convert to hours
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