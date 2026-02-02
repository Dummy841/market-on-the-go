// Ringtone as a data URL so it works reliably in web + Capacitor WebView.
// (Our current public/ringtone.mp3 file is a data-url text file, which the <audio>
// element cannot play when referenced as "/ringtone.mp3".)

export const RINGTONE_DATA_URL =
  "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAADhAC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAA4T/////////AAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUAB1gAAANIADP8AAABFRBjZGwAACI6DGy9gAAE//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+5JkAAADVAAdYAAAAiOgxsvYAAARUQY2RsAAA";
