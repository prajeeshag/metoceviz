import { MapViz } from './js/mapviz.js';

function injectStyles() {
    const styleId = "gemini-canvas-styles";
    
    // Check if we already injected it
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
    .canvas-stack {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: 1fr;
        /* Ensure the container matches the canvas size */
        width: fit-content; 
    }
    .canvas-stack > canvas {
        grid-area: 1 / 1 / 2 / 2; /* All canvases start at row 1, col 1 */
        pointer-events: none;     /* Allow interaction with layers below */
    }
    /* If you want the bottom-most canvas to be interactive */
    .canvas-stack > canvas:first-child {
      pointer-events: auto;
    }
    `;
    document.head.appendChild(style);
 }

injectStyles()
// const myCanvas1 = document.getElementById('globe1');
// const globe1 = new MapViz(myCanvas1, 'mercator', [800, 600]);
const myCanvas2 = document.getElementById('globe2');
const globe2 = new MapViz(myCanvas2, 'orthographic', [600, 400]);

