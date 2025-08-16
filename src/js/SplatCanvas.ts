import { Application, Asset, AssetListLoader, CameraComponent, Color, Entity, FILLMODE_NONE, Pose, RESOLUTION_AUTO, Vec3 } from "playcanvas";

interface SuperSplatProjectDocument {
  "camera": {
    "fov": number,
  },
  "view": {
    "bgColor": [number, number, number, number],
  }
  "poseSets": [
    {
        "poses": [
            {
                frame: number,
                position: [number, number, number],
                target: [number, number, number]
            }
        ]
    }
  ]
}

class SplatCanvas {

    private canvas: HTMLCanvasElement;
    private app!: Application;
    private camera?: Entity;
    private poses: Pose[] = [];
    private poseIdx = 0;
    private updateCameraFn?: () => void;

    constructor(canvas: HTMLCanvasElement){
        this.canvas = canvas;
        this.init();
        void this.asyncInit();
    }    

    private init(){
        const parent = this.canvas.parentElement as HTMLElement;
        const resolution = () => [parent.offsetWidth, parent.offsetHeight];

        this.app = new Application(this.canvas, {
            graphicsDeviceOptions: {
                antialias: false
            }
        });
        this.app.setCanvasFillMode(FILLMODE_NONE, ...resolution());
        this.app.setCanvasResolution(RESOLUTION_AUTO);
        this.app.start();

        window.addEventListener('resize', () => this.app.resizeCanvas(...resolution()));
    }

    private async asyncInit(){
        const sceneName = this.canvas.dataset.scene;
        if(!sceneName){
            console.warn('no scene set');
            return;
        }

        const location = './assets/static/' + sceneName;
        const [splat, document] = await this.loadAssets(location);

        const ssDocument = document.resource as SuperSplatProjectDocument;

        this.initPoses(ssDocument);
        this.initCamera(ssDocument);
        this.initSplat(splat);
    }

    private async loadAssets(location: string): Promise<[Asset, Asset]>{
        const assetList: [Asset, Asset] = [
            new Asset('SOGS Asset', 'gsplat', { url: location + '/meta.json' }),
            new Asset('Doc Asset', 'json', { url: location + '/document.json' })
        ];
        const loader = new AssetListLoader(assetList, this.app.assets);
        await new Promise(resolve => loader.load(resolve));
        return assetList;
    }

    private initPoses(document: SuperSplatProjectDocument){
        this.poses = document.poseSets[0].poses.map((f) => new Pose().look(new Vec3(...f.position), new Vec3(...f.target)));
    }

    private initCamera(document: SuperSplatProjectDocument){
        this.camera = new Entity('Camera');

        this.camera.addComponent('camera');
        const camera = this.camera.camera as CameraComponent;

        camera.clearColor = new Color(...document.view.bgColor);
        camera.camera.fov = document.camera.fov / 2;

        this.app.root.addChild(this.camera);
        this.app.on('update', () => {
            if(this.updateCameraFn)
                this.updateCameraFn();
        });

        const firstPose = this.poses[0];

        this.moveToPose(firstPose);
    }

    initSplat(splatAsset: Asset){
        const splat = new Entity('Scene');
        splat.addComponent('gsplat', { asset: splatAsset });
        splat.setPosition(0, 0, 0);
        splat.setEulerAngles(0, 0, 180);
        this.app.root.addChild(splat);
    }

    private moveToPose(toPose: Pose, durationMillis: number = 0){
        if(!this.camera){
            console.warn('no camera');
            return;
        }
        const camera = this.camera;
        const startMillis = Date.now();
        const endMillis = startMillis + durationMillis;
        const fromPose = new Pose(camera.getPosition(), camera.getEulerAngles());
        this.updateCameraFn = () => {
            const now = Date.now();            
            const alpha = (now - startMillis) / (endMillis - startMillis);

            const newPose = (alpha >= 1) ? toPose : fromPose.lerp(fromPose, toPose, alpha, alpha);
            camera.setPosition(newPose.position);
            camera.setEulerAngles(newPose.angles);

            if(alpha >= 1)
                this.updateCameraFn = undefined;
        };
    }

    public togglePose(durationMillis: number = 0){
        this.poseIdx = (this.poseIdx + 1) % this.poses.length;
        this.moveToPose(this.poses[this.poseIdx], durationMillis);
    }
}

export {SplatCanvas}