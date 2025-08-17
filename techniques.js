// src/services/techniques.js
export function makeTechniqueTemplate(key) {
    switch (key) {
      case "pomodoro25": return { work:25, break:5, maxBlockMin:120, label:"Pomodoro 25/5" };
      case "pomodoro50": return { work:50, break:10, maxBlockMin:150, label:"Pomodoro 50/10" };
      case "deepwork":   return { work:90, break:15, maxBlockMin:180, label:"Deep Work 90/15" };
      case "timeblock":  return { work:60, break:10, maxBlockMin:180, label:"Time‑block 60/10" };
      case "spaced":     return { work:30, break:5,  maxBlockMin:120, label:"Spaced 30/5", spaced:true };
      case "recall":     return { work:30, break:5,  maxBlockMin:120, label:"Active Recall 30/5", recall:true };
      default:           return { work:25, break:5,  maxBlockMin:120, label:"Pomodoro 25/5" };
    }
  }
  