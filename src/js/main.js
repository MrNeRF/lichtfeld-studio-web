import '../scss/styles.scss'
import * as bootstrap from 'bootstrap'
import { Application, Asset, AssetListLoader, Entity, FILLMODE_NONE, RESOLUTION_AUTO, Color, Pose, Vec3, OrbitController, registerScript } from 'playcanvas';
import { OrbitCamera } from './orbitCamera';

const frames = [
    { name: "camera_0", frame: 0, position: [0.5152179002761841, -0.5271931886672974, -14.783656120300293], target: [4.718909250720638, -1.1595693795703532, -15.797529001366705] },
    { name: "camera_1", frame: 10, position: [6.598812580108643, -0.990289032459259, -15.008820533752441], target: [4.724208762543264, -0.9435742411014647, -15.934494403234446] },
    { name: "camera_2", frame: 20, position: [6.673564434051514, 2.5995535850524902, -14.118382453918457], target: [3.833778862111298, -0.6266914012983276, -15.841870408803565] },
    { name: "camera_14", frame: 30, position: [3.6317026615142822, 1.0316636562347412, -17.420621871948242], target: [5.426714695746827, -0.06657010318882428, -17.443420348398153] },
    { name: "camera_4", frame: 40, position: [7.5393242835998535, 0.8958652019500732, -19.5137882232666], target: [6.658450194705706, 0.48290040145139945, -17.841496160644667] },
    { name: "camera_5", frame: 50, position: [5.3803277015686035, -1.2865020036697388, -14.582201957702637], target: [3.8074345451769736, -1.1278031763842364, -14.40417346426626] },
    { name: "camera_6", frame: 60, position: [3.141937255859375, 0.393507182598114, -14.70595645904541], target: [3.784203778573371, -1.339259225197877, -16.622846018183008] },
    { name: "camera_7", frame: 70, position: [-1.1016734838485718, -1.589154839515686, -14.396332740783691], target: [2.0482966226641985, -1.1808704938505097, -15.51690261281746] },
    { name: "camera_8", frame: 80, position: [-4.1539740562438965, 1.586875319480896, -12.315895080566406], target: [0.6681988433781838, -0.4230016219898478, -15.487317556193565] },
    { name: "camera_9", frame: 90, position: [-1.3581956624984741, 0.19601188600063324, -17.45089340209961], target: [1.4163559419769003, -0.5875936573841885, -14.740288439148904] },
    { name: "camera_10", frame: 100, position: [5.0513739585876465, -1.1325165033340454, -15.901810646057129], target: [6.910893060065041, -2.2677751643096906, -12.633370429760284] },
    { name: "camera_11", frame: 110, position: [7.175067901611328, 3.1420819759368896, -14.682089805603027], target: [7.175068100546802, -0.6054418741139838, -14.68208980849473] },
    { name: "camera_12", frame: 120, position: [3.702303647994995, 3.1846725940704346, -17.460329055786133], target: [3.7023036741762025, -0.4234664393583717, -17.46032827277097] },
    { name: "camera_13", frame: 130, position: [1.6199569702148438, 0.15029223263263702, -17.83814811706543], target: [4.124986440122177, -0.5212596984238412, -17.514515061558846] },
];

const transitionMillis = 4000;

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

    const assetBontanics = new Asset('Botanics Asset', 'gsplat', { url: './assets/static/botanics/meta.json' });
    const loader = new AssetListLoader([assetBontanics], app.assets);
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
    splat.addComponent('gsplat', { asset: assetBontanics });
    splat.setPosition(0, 0, 0);
    splat.setEulerAngles(0, 0, 180);
    app.root.addChild(splat);

    const poses = frames.map((f) => new Pose().look(new Vec3(...f.position), new Vec3(...f.target)));

    
    let poseIdx = 0;
    let lastTime;

    const applyPose = (pose) => {
        camera.setPosition(pose.position);
        camera.setEulerAngles(pose.angles);
    };

    app.on('update', () => {
        const thisTime = Date.now();
        if(thisTime > lastTime + transitionMillis) lastTime = undefined;
        if(!lastTime) return;

        const alpha = (thisTime - lastTime) / transitionMillis;
        const lastPose = poses[(poseIdx + poses.length - 1) % poses.length];
        applyPose(lastPose.lerp(lastPose, poses[poseIdx], alpha, alpha));
    });
    

    canvas.addEventListener('click', () => {
        lastTime = Date.now();
        poseIdx = (poseIdx + 1) % frames.length;
    });

    applyPose(poses[poseIdx]);
});

