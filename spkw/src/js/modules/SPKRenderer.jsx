/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Dimitrie Andrei Stefanescu & University College London (UCL)
 */
import $ from 'jquery';
import THREE from 'three';
import TWEEN from 'tween.js';
import ThreeOrbitCtrls from 'three-orbit-controls';
var OrbitCtrls = ThreeOrbitCtrls(THREE);

import SPKLoader from './SPKLoader.jsx';
import SPKMaker from './SPKObjectMaker.js';

export default class SPKRenderer {
    constructor(options) {
        this.HTML = {
            canvas: ""
        };

        this.Options = {};
        if (options != undefined) {
            this.Options = options;
        }

        this.VIEWER = {
            renderer: null,
            camera: null,
            scene: null,
            controls: null,
            sunlight: null,
            raycaster: null
        };

        this.SCENE = {
            grid: null,
            groundplane: null,
            shadowlight: null,
            shadows: true
        };
        this.boundingSphere = "";

        this.init = this.init.bind(this);
        this.fadeIn = this.fadeIn.bind(this);
        this.fadeOut = this.fadeOut.bind(this);
        this.purgeScene = this.purgeScene.bind(this);
        this.onLoadInstance = this.onLoadInstance.bind(this);
        this.onLoadStaticInstance = this.onLoadStaticInstance.bind(this);
        this.setupEnvironment = this.setupEnvironment.bind(this);
        this.makeContext = this.makeContext.bind(this);
        this.setCamera = this.setCamera.bind(this);
        this.setCameraTween = this.setCameraTween.bind(this);
        this.zoomExtents = this.zoomExtents.bind(this);
        this.startRendering = this.startRendering.bind(this);
        this.renderFrame = this.renderFrame.bind(this);
    }

    init(canvasId) {
        this.HTML.canvas = $(`#${canvasId}`);

        // need to init scene before:
        // getmodel meta > load params > make scene > load static  & first instance (into scene) >
        // > compute bounding box > setup environment > renderloop
        this.VIEWER.scene = new THREE.Scene();
    };

    fadeIn(objects) {
        let duration = 300, opacity = 0.95;

        let tweenIn = new TWEEN.Tween({x: 0})
            .to({x: opacity}, duration)
            .onUpdate(function () {
                for (let i = 0; i < objects.length; i++) {
                    objects[i].material.opacity = this.x;
                }
            });

        tweenIn.start();
    };

    fadeOut(objects) {
        let opacity = 0.95, duration = 300;

        let SPKRenderer = this;
        let tweenOut = new TWEEN.Tween({x: opacity})
            .to({x: 0}, duration)
            .onUpdate(function () {
                for (let i = 0; i < objects.length; i++) {
                    objects[i].material.opacity = this.x;
                }
            })
            .onComplete(function () {
                for (let i = 0; i < objects.length; i++) {
                    SPKRenderer.VIEWER.scene.remove(objects[i]);
                    objects[i].geometry.dispose();
                    objects[i].material.dispose();
                }
            });

        tweenOut.start();
    };

    purgeScene(currentKey) {
        // theoretically should do nothing; but we do have cases when we have overlapping instances
        // due to "quickness" of slider drag, and the way we handle object loading. yoop.

        let out = [];

        for (let i = 0; i < this.VIEWER.scene.children.length; i++) {
            let myObj = this.VIEWER.scene.children[i];
            if ((myObj.removable) && (myObj.instance != currentKey))
                out.push(myObj);
        }

        this.fadeOut(out)
    };

    onLoadInstance(instanceData, currentKey) {
        for (let i = 0; i < instanceData.geometries.length; i++) {
            SPKMaker.make(instanceData.geometries[i], currentKey, instanceData => {
                this.VIEWER.scene.add(instanceData);
            });
        }

        this.computeBoundingSphere(currentKey);

        let iin = [];
        for (let i = 0; i < this.VIEWER.scene.children.length; i++) {
            let myObj = this.VIEWER.scene.children[i];

            if (myObj.removable && myObj.instance === currentKey) {
                iin.push(myObj);
            }
        }

        this.fadeIn(iin);
    }

    onLoadStaticInstance(instanceData) {
        for (let i = 0; i < instanceData.geometries.length; i++) {
            SPKMaker.make(instanceData.geometries[i], "static", instanceData => {
                // TODO : Make unremovable
                instanceData.removable = false;
                instanceData.material.opacity = 1;
                this.VIEWER.scene.add(instanceData);
            });
        }
    }

    computeBoundingSphere(currentKey) {
        let geometry = new THREE.Geometry();

        for (let i = 0; i < this.VIEWER.scene.children.length; i++) {
            if (this.VIEWER.scene.children[i].selectable
                && this.VIEWER.scene.children[i].instance === currentKey) {
                geometry.merge(this.VIEWER.scene.children[i].geometry);
            }
        }

        geometry.computeBoundingSphere();
        this.boundingSphere = geometry.boundingSphere;
        geometry.dispose();
    };


    setupEnvironment() {
        // TODO: Grids, etc.
        // make the scene + renderer

        let fov = 30; // default fov
        if (typeof this.Options.camerafov !== 'undefined' || this.Options.camerafov !== null)
            fov = this.Options.camerafov;

        let lightintensity = 0.4; // default light intensity
        if (typeof this.Options.lightintensity !== 'undefined' || this.Options.lightintensity !== null)
            lightintensity = this.Options.lightintensity;

        this.VIEWER.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});

        this.VIEWER.renderer.setClearColor(0xF2F2F2);

        this.VIEWER.renderer.setPixelRatio(1);  // change to window.devicePixelRatio

        this.VIEWER.renderer.setSize($(this.HTML.canvas).innerWidth(), $(this.HTML.canvas).innerHeight());

        this.VIEWER.renderer.shadowMap.enabled = true;
        this.VIEWER.renderer.shadowMap.type = THREE.PCFShadowMap;

        $(this.HTML.canvas).append(this.VIEWER.renderer.domElement);

        this.VIEWER.camera = new THREE.PerspectiveCamera(fov,
            $(this.HTML.canvas).innerWidth() * 1 / $(this.HTML.canvas).innerHeight(),
            1,
            this.boundingSphere.radius * 100);

        this.VIEWER.camera.position.z = -this.boundingSphere.radius * 1.8;

        this.VIEWER.camera.position.y = this.boundingSphere.radius * 1.8;

        this.VIEWER.controls = new OrbitCtrls(this.VIEWER.camera, this.VIEWER.renderer.domElement);

        this.VIEWER.controls.addEventListener('change', function () {

        });

        // shadow light
        let light = new THREE.SpotLight(0xffffff, lightintensity);
        light.position.set(this.boundingSphere.center.x + this.boundingSphere.radius * 3,
            this.boundingSphere.center.y + this.boundingSphere.radius * 3,
            this.boundingSphere.center.z + this.boundingSphere.radius * 5);
        light.target.position.set(this.boundingSphere.center.x,
            this.boundingSphere.center.y,
            this.boundingSphere.center.z);
        light.castShadow = true;

        light.shadowMapWidth = 2048;
        light.shadowMapHeight = 2048;
        light.shadowBias = -0.00001;
        light.shadowDarkness = 0.5;
        //light.position.set(this.boundingSphere.center.x + this.boundingSphere.radius * 1.7,
        // this.boundingSphere.center.y + this.boundingSphere.radius * 3,
        // this.boundingSphere.center.z + this.boundingSphere.radius * 1.7);

        this.SCENE.shadowlight = light;
        this.VIEWER.scene.add(light);

        // camera light
        this.VIEWER.scene.add(new THREE.AmbientLight(0xD8D8D8));

        let flashlight = new THREE.PointLight(0xCFCFCF, 0.8, this.boundingSphere.radius * 12, 1);

        this.VIEWER.camera.add(flashlight);

        this.VIEWER.scene.add(this.VIEWER.camera);

        // grids
        this.makeContext();

        // resize events
        let SPK = this;
        $(window).resize(function () {
            SPK.VIEWER.renderer.setSize($(SPK.HTML.canvas).innerWidth() - 1, $(SPK.HTML.canvas).innerHeight() - 5);
            SPK.VIEWER.camera.aspect = ($(SPK.HTML.canvas).innerWidth() - 1) / ($(SPK.HTML.canvas).innerHeight() - 5);
            SPK.VIEWER.camera.updateProjectionMatrix();
        });

        window.scene = this.VIEWER.scene;
    };


    makeContext() {
        let multiplier = 10;

        let planeGeometry = new THREE.PlaneGeometry(this.boundingSphere.radius * multiplier * 2,
            this.boundingSphere.radius * multiplier * 2, 2, 2); //three.THREE.PlaneGeometry( width, depth, segmentsWidth, segmentsDepth );
        planeGeometry.rotateX(-Math.PI / 2);
        let planeMaterial = new THREE.MeshBasicMaterial({color: 0xEEEEEE}); //0xEEEEEE #D7D7D7
        plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.receiveShadow = true;
        plane.position.set(this.boundingSphere.center.x, -0.21, this.boundingSphere.center.z);
        plane.visible = true;

        this.VIEWER.scene.add(plane);
        this.SCENE.plane = plane;

        if (this.boundingSphere.radius === 0) {
            console.error("ERR: Failed to calculate bounding sphere. This is a known bug and it happens when " +
                "there's no valid geometry in the scene.");
            //$(".model-name").append(
            $(this.HTML.sliders).html(
                "<br><p style='color: red'>Failed to load model. " +
                "<strong>Check the console for details (if you feel like a hacker), and send a shout over to " +
                "<a href='mailto:contact@dimitrie.org?subject=Model " + this.GLOBALS.model +
                " failed to load'>contact@dimitrie.org.</a> " +
                "so we can look into it. Thanks!</p>")
        } else {
            grid = new THREE.GridHelper(this.boundingSphere.radius * multiplier,
                this.boundingSphere.radius * multiplier / 30);
            grid.material.opacity = 0.15;
            grid.material.transparent = true;
            grid.position.set(this.boundingSphere.center.x, -0.2, this.boundingSphere.center.z);
            grid.setColors(0x0000ff, 0x808080);
            this.VIEWER.scene.add(grid);
            this.SCENE.grid = grid;
        }
    };

    zoomExtents() {
        let r = this.boundingSphere.radius;
        let offset = r / Math.tan(Math.PI / 180.0 * this.VIEWER.controls.object.fov * 0.4);
        let vector = new THREE.Vector3(0, 0, 1);
        let dir = vector.applyQuaternion(this.VIEWER.controls.object.quaternion);
        let newPos = new THREE.Vector3();
        dir.multiplyScalar(offset * 1.05);
        newPos.addVectors(this.boundingSphere.center, dir);

        let futureLocation = {};
        futureLocation.position = newPos;
        futureLocation.rotation = this.VIEWER.controls.object.rotation.clone();
        futureLocation.controlCenter = this.boundingSphere.center.clone();
        this.setCameraTween(JSON.stringify(futureLocation));
    };

    startRendering() {
        this.setupEnvironment();
        this.renderFrame();
        this.zoomExtents();
    };

    renderFrame() {
        requestAnimationFrame(this.renderFrame);
        TWEEN.update();

        this.VIEWER.renderer.render(this.VIEWER.scene, this.VIEWER.camera);
    }

    setCamera(where) {
        let cam = JSON.parse(where);

        this.VIEWER.camera.position.set(cam.position.x, cam.position.y, cam.position.z);
        this.VIEWER.camera.rotation.set(cam.rotation.x, cam.rotation.y, cam.rotation.z);

        this.VIEWER.controls.center.set(cam.controlCenter.x, cam.controlCenter.y, cam.controlCenter.z);
        this.VIEWER.controls.update();
    };

    setCameraTween(where) {
        let duration = 600;
        let cam = JSON.parse(where);
        let SPK = this;

        new TWEEN.Tween(this.VIEWER.camera.position).to({
            x: cam.position.x,
            y: cam.position.y,
            z: cam.position.z
        }, duration).onUpdate(function () {
            //SPK.VIEWER.controls.update(); // not needed as it seems to be enough to call it once in the last tween
        }).easing(TWEEN.Easing.Quadratic.InOut).start();

        new TWEEN.Tween(this.VIEWER.camera.rotation).to({
            x: cam.rotation.x,
            y: cam.rotation.y,
            z: cam.rotation.z
        }, duration).onUpdate(function () {
            //SPK.VIEWER.controls.update();
        }).easing(TWEEN.Easing.Quadratic.InOut).start();

        new TWEEN.Tween(this.VIEWER.controls.center).to({
            x: cam.controlCenter.x,
            y: cam.controlCenter.y,
            z: cam.controlCenter.z
        }, duration).onUpdate(function () {
            SPK.VIEWER.controls.update();
        }).easing(TWEEN.Easing.Quadratic.InOut).start();
    };

};

