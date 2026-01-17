import { MapViz } from './js/mapviz.js';

const myCanvas1 = document.getElementById('globe1');
const globe1 = new MapViz({ container: myCanvas1, projection: 'mercator' });

const myCanvas2 = document.getElementById('globe2');
const globe2 = new MapViz({ container: myCanvas2, projection: 'orthographic' });