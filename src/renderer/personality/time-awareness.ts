/**
 * Time awareness utilities for personality-driven behavior
 */

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';

/**
 * Get the current time of day category
 */
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 9) {
    return 'morning';      // 5:00 - 8:59
  } else if (hour >= 9 && hour < 12) {
    return 'afternoon';    // 9:00 - 11:59
  } else if (hour >= 12 && hour < 18) {
    return 'afternoon';    // 12:00 - 17:59
  } else if (hour >= 18 && hour < 22) {
    return 'evening';      // 18:00 - 21:59
  } else if (hour >= 22 && hour < 23) {
    return 'night';        // 22:00 - 22:59
  } else {
    return 'late_night';   // 23:00 - 4:59
  }
}

/**
 * Get a human-readable time context description
 */
export function getTimeContext(): string {
  const timeOfDay = getTimeOfDay();
  const hour = new Date().getHours();
  const minute = new Date().getMinutes();

  const timeStr = `${hour}:${String(minute).padStart(2, '0')}`;

  switch (timeOfDay) {
    case 'morning':
      return `早晨${timeStr}，新的一天开始了`;
    case 'afternoon':
      if (hour < 12) return `上午${timeStr}`;
      return `下午${timeStr}`;
    case 'evening':
      return `晚上${timeStr}，一天快要结束了`;
    case 'night':
      return `深夜${timeStr}，夜深了`;
    case 'late_night':
      return `凌晨${timeStr}，该休息了`;
  }
}

/**
 * Check if current time is quiet hours (23:00 - 7:00)
 */
export function isQuietHours(): boolean {
  const hour = new Date().getHours();
  return hour >= 23 || hour < 7;
}

/**
 * Get greeting based on time since last seen
 */
export function getTimeSinceLastSeen(lastSeen: number): string {
  const hoursSince = (Date.now() - lastSeen) / (1000 * 60 * 60);

  if (hoursSince < 0.5) {
    return '刚刚';
  } else if (hoursSince < 1) {
    return '半小时';
  } else if (hoursSince < 6) {
    return `${Math.floor(hoursSince)}小时`;
  } else if (hoursSince < 24) {
    return `${Math.floor(hoursSince / 6)}个半天`;
  } else if (hoursSince < 48) {
    return '一天';
  } else {
    return `${Math.floor(hoursSince / 24)}天`;
  }
}

/**
 * Get greeting for time of day
 */
export function getGreetingForTimeOfDay(): string {
  const timeOfDay = getTimeOfDay();

  switch (timeOfDay) {
    case 'morning':
      return '早上好喵~';
    case 'afternoon':
      return '你好呀喵~';
    case 'evening':
      return '晚上好喵~';
    case 'night':
      return '还没睡吗喵~';
    case 'late_night':
      return '这么晚还不睡，要注意身体喵~';
  }
}
