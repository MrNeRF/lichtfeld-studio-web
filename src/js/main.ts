import '../scss/styles.scss'
import { SplatCanvas } from './SplatCanvas';


window.addEventListener('DOMContentLoaded', async () => {
    document.querySelectorAll('canvas[data-scene]').forEach((node) => {
        const canvas = node as  HTMLCanvasElement;
        const splatCanvas = new SplatCanvas(canvas);

        canvas.addEventListener('click', () => {
            splatCanvas.togglePose(1000);
        });
    });
});

