export function logWithTime(logString: string) {
    console.log(new Date().toLocaleString() + ": " + logString);
}

export function errWithTime(logString: string) {
    console.error(new Date().toLocaleString() + ": " + logString);
}