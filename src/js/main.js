import '../scss/styles.scss'
import * as bootstrap from 'bootstrap'
import { Application, Asset, AssetListLoader, Entity, FILLMODE_NONE, RESOLUTION_AUTO, Color, Pose, Vec3, OrbitController } from 'playcanvas';

window.addEventListener('DOMContentLoaded', async () => {
    // Create application
    const canvas = document.querySelector('#large-splat');
    const bootstrapContainer = document.querySelector('.container');

    const app = new Application(canvas, {
        graphicsDeviceOptions: {
            antialias: false
        }
    });

    const resolution = () => [canvas.parentElement.offsetWidth, bootstrapContainer.offsetWidth / 2];

    app.setCanvasFillMode(FILLMODE_NONE, ...resolution());
    app.setCanvasResolution(RESOLUTION_AUTO);
    app.start();


    window.addEventListener('resize', () => app.resizeCanvas(...resolution()));

    // Load assets
    const assets = [
        new Asset('scene', 'gsplat', {
            url: '../assets/botanics/meta.json'
        })
    ];

    const loader = new AssetListLoader(assets, app.assets);
    await new Promise(resolve => loader.load(resolve));


    // Create camera entity
    const camera = new Entity('Camera');
    camera.addComponent('camera');
    camera.addComponent('script');
    camera.camera.clearColor = new Color(102, 102, 102);
    camera.camera.fov = 30;
    app.root.addChild(camera);
    camera.setPosition(-0.2589048147201538, -0.525307834148407, -14.180912017822266);
    camera.lookAt(4.376051060512836, -0.7526616755988405, -15.951593063115695);

    // Create splat entity
    const splat = new Entity('Scene');
    splat.addComponent('gsplat', { asset: assets[0] });
    splat.setPosition(0, 0, 0);
    splat.setEulerAngles(0, 0, 180);
    app.root.addChild(splat);
});

