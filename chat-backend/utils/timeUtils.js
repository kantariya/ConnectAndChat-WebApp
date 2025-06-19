// Returns true if now is within msLimit of timestamp
export const withinTimeLimit = (timestamp, msLimit) => {
  const now = Date.now();
  const msgTime = new Date(timestamp).getTime();
  return now - msgTime <= msLimit;
};
