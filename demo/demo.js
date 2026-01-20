import { MapViz } from './js/mapviz.js';

const myCanvas1 = document.getElementById('globe1');
const globe1 = new MapViz(myCanvas1, 'mercator', [600, 400]);

const myCanvas2 = document.getElementById('globe2');
const globe2 = new MapViz(myCanvas2, 'orthographic', [600, 400]);