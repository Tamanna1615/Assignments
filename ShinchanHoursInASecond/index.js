let age = parseInt(prompt("Enter your age in years:"));
const secondsInMinute = 60;
const minutesInHour = 60;
const hoursInDay = 24;
const daysInYear = 365;

let secondsInYear = daysInYear * hoursInDay * minutesInHour * secondsInMinute;

let ageInSeconds = age * secondsInYear;

console.log(secondsInYear);
console.log(ageInSeconds);
