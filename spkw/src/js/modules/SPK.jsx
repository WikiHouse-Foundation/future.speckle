/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Dimitrie Andrei Stefanescu & University College London (UCL)
 */

import $ from 'jquery';
import THREE from 'three';
import noUISlider from 'nouislider';
import TWEEN from 'tween.js';
import ThreeOrbitCtrls from 'three-orbit-controls';
var OrbitCtrls = ThreeOrbitCtrls(THREE);

import SPKLoader from './SPKLoader.js';
import SPKMaker from './SPKObjectMaker.js';

export default class SPK {
    constructor(options) {
        this.Options = options;

        this.HMTL = {
            canvas: ""
        };

        this.META = {};
        this.PARAMS = {};

        this.GLOBALS = {
            model: "",
            metadata: {
                paramsFile: "",
                staticGeoFile: "",
                rootFiles: ""
            },
            sliders: [],
            currentKey: "",
            boundingSphere: ""
        };


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

        this.init = this.init.bind(this);
        this.getModelMeta = this.getModelMeta.bind(this);
        this.loadParameters = this.loadParameters.bind(this);
        this.fadeIn = this.fadeIn.bind(this);
        this.fadeOut = this.fadeOut.bind(this);
        this.purgeScene = this.purgeScene.bind(this);
        this.addNewInstance = this.addNewInstance.bind(this);
        this.loadParallelInstance = this.loadParallelInstance.bind(this);
        this.loadInstance = this.loadInstance.bind(this);
        this.loadStaticInstance = this.loadStaticInstance.bind(this);
        this.render = this.render.bind(this);
        this.setupEnvironment = this.setupEnvironment.bind(this);
        this.makeContext = this.makeContext.bind(this);
        this.setCamera = this.setCamera.bind(this);
        this.setCameraTween = this.setCameraTween.bind(this);
        this.zoomExtents = this.zoomExtents.bind(this);
    }

    init() {
        this.Options.lockCameraOnInstanceChange = false;

        // get those elements in place, you cunt
        this.HMTL.canvas = $("#" + this.Options.canvasid);

        // get the model url
        let href = window.location.pathname;

        this.GLOBALS.model = href.substr(href.lastIndexOf('/') + 1);

        // need to init scene before:
        // getmodel meta > load params > make scene > load static  & first instance (into scene) >
        // > compute bounding box > setup environment > renderloop
        this.VIEWER.scene = new THREE.Scene();

        let SPK = this;
        // load parameters && go!
        this.getModelMeta(function () {
            SPK.loadParameters(function (firstKey) {
                SPK.addNewInstance(firstKey, function () {
                    SPK.loadStaticInstance();
                    SPK.setupEnvironment();
                    SPK.render();
                    SPK.zoomExtents();

                    if (SPK.Options.onInitEnd !== undefined) {
                        SPK.Options.onInitEnd(SPK)
                    }
                });
            });
        });
    };

    getModelMeta(callback) {
        let SPK = this;
        $.getJSON(SPKConfig.GEOMAPI + this.GLOBALS.model, function (data) {
            SPK.META = data;

            data.deflateLocation = data.deflateLocation.replace("./", "/");

            SPK.GLOBALS.metadata.paramsFile = SPKConfig.APPDIR + data.deflateLocation + "/params.json";
            SPK.GLOBALS.metadata.staticGeoFile = SPKConfig.APPDIR + data.deflateLocation + "/static.json";
            SPK.GLOBALS.metadata.rootFiles = SPKConfig.APPDIR + data.deflateLocation + "/";

            if (callback !== undefined) {
                callback();
            }
        });
    };

    // Loads the parameters file and passen on to call back the first key to load
    // Used only in init
    loadParameters(callback) {
        let SPK = this;
        $.getJSON(this.GLOBALS.metadata.paramsFile, function (data) {
            SPK.PARAMS = data;
            callback(data.kvpairs[0].key);
        });
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

        let tweenOut = new TWEEN.Tween({x: opacity})
            .to({x: 0}, duration)
            .onUpdate(function () {
                for (let i = 0; i < objects.length; i++)
                    objects[i].material.opacity = this.x;
            })
            .onComplete(function () {
                for (let i = 0; i < objects.length; i++) {
                    SPK.VIEWER.scene.remove(objects[i]);
                    objects[i].geometry.dispose();
                    objects[i].material.dispose();
                }
            });

        tweenOut.start();
    };

    purgeScene() {
        // theoretically should do nothing; but we do have cases when we have overlapping instances
        // due to "quickness" of slider drag, and the way we handle object loading. yoop.

        let out = [];

        for (let i = 0; i < this.VIEWER.scene.children.length; i++) {
            let myObj = this.VIEWER.scene.children[i];
            if ((myObj.removable) && (myObj.instance != this.GLOBALS.currentKey))
                out.push(myObj);
        }

        this.fadeOut(out)
    };

    addNewInstance(key, callback) {
        if (this.GLOBALS.currentKey === key)
            return;

        this.GLOBALS.currentKey = key;
        this.purgeScene();

        let SPK = this;
        this.loadInstance(key, function () {
            let iin = [];
            for (let i = 0; i < SPK.VIEWER.scene.children.length; i++) {
                let myObj = SPK.VIEWER.scene.children[i];

                if (myObj.removable && ( myObj.instance === SPK.GLOBALS.currentKey )) {
                    iin.push(myObj);
                }
            }

            SPK.fadeIn(iin);

            if (callback !== undefined) {
                callback();
            }
            if (SPK.Options.onInstanceChange !== undefined) {
                SPK.Options.onInstanceChange(SPK.PARAMS, key);
            }
        });
    };

    computeBoundingSphere() {
        let geometry = new THREE.Geometry();

        for (let i = 0; i < this.VIEWER.scene.children.length; i++) {
            if (this.VIEWER.scene.children[i].selectable
                && this.VIEWER.scene.children[i].instance === this.GLOBALS.currentKey) {
                geometry.merge(this.VIEWER.scene.children[i].geometry);
            }
        }

        geometry.computeBoundingSphere();
        this.GLOBALS.boundingSphere = geometry.boundingSphere;
        geometry.dispose();
    };

    // Wrapper and parser
    loadParallelInstance(data) {
        let instanceKey = "";
        let k = 0;
        for (let property in data) {
            if (data.hasOwnProperty(property)) {
                if (++k <= this.PARAMS.parameters.length) {
                    instanceKey += data[property] + ",";
                }
            }
        }

        if (instanceKey != "") {
            this.addNewInstance(instanceKey);
        } else {
            console.error("Oups. Bad onbrush event.")
        }
    };

    // Tells file.json > SPKLoader > SPKMaker > objects > adds them to scene
    // Initial opacity is set to 0 so new objs can be fadedIn
    loadInstance(key, callback) {
        let SPK = this;
        SPKLoader.load(this.GLOBALS.metadata.rootFiles + key + ".json", function (obj) {

            for (let i = 0; i < obj.geometries.length; i++) {
                SPKMaker.make(obj.geometries[i], key, function (obj) {
                    SPK.VIEWER.scene.add(obj);
                });
            }

            SPK.computeBoundingSphere();
            if (callback != undefined) {
                callback();
            }
        });
    };

    loadStaticInstance() {
        let SPK = this;
        SPKLoader.load(this.GLOBALS.metadata.staticGeoFile, function (obj) {
            for (let i = 0; i < obj.geometries.length; i++) {
                SPKMaker.make(obj.geometries[i], "static", function (obj) {

                    // TODO : Make unremovable
                    obj.removable = false;
                    obj.material.opacity = 1;
                    SPK.VIEWER.scene.add(obj);
                });
            }
        });
    };

    render() {
        requestAnimationFrame(this.render);
        TWEEN.update();

        this.VIEWER.renderer.render(this.VIEWER.scene, this.VIEWER.camera);
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

        this.VIEWER.renderer.setSize($(this.HMTL.canvas).innerWidth(), $(this.HMTL.canvas).innerHeight());

        this.VIEWER.renderer.shadowMap.enabled = true;
        this.VIEWER.renderer.shadowMap.type = THREE.PCFShadowMap;

        $(this.HMTL.canvas).append(this.VIEWER.renderer.domElement);

        this.VIEWER.camera = new THREE.PerspectiveCamera(fov,
            $(this.HMTL.canvas).innerWidth() * 1 / $(this.HMTL.canvas).innerHeight(),
            1,
            this.GLOBALS.boundingSphere.radius * 100);

        this.VIEWER.camera.position.z = -this.GLOBALS.boundingSphere.radius * 1.8;

        this.VIEWER.camera.position.y = this.GLOBALS.boundingSphere.radius * 1.8;

        this.VIEWER.controls = new OrbitCtrls(this.VIEWER.camera, this.VIEWER.renderer.domElement);

        this.VIEWER.controls.addEventListener('change', function () {

        });

        // shadow light
        let light = new THREE.SpotLight(0xffffff, lightintensity);
        light.position.set(this.GLOBALS.boundingSphere.center.x + this.GLOBALS.boundingSphere.radius * 3,
            this.GLOBALS.boundingSphere.center.y + this.GLOBALS.boundingSphere.radius * 3,
            this.GLOBALS.boundingSphere.center.z + this.GLOBALS.boundingSphere.radius * 5)
        light.target.position.set(this.GLOBALS.boundingSphere.center.x,
            this.GLOBALS.boundingSphere.center.y,
            this.GLOBALS.boundingSphere.center.z);
        light.castShadow = true;

        light.shadowMapWidth = 2048;
        light.shadowMapHeight = 2048;
        light.shadowBias = -0.00001;
        light.shadowDarkness = 0.5;
        //light.position.set(this.GLOBALS.boundingSphere.center.x + this.GLOBALS.boundingSphere.radius * 1.7,
        // this.GLOBALS.boundingSphere.center.y + this.GLOBALS.boundingSphere.radius * 3,
        // this.GLOBALS.boundingSphere.center.z + this.GLOBALS.boundingSphere.radius * 1.7);

        this.SCENE.shadowlight = light;
        this.VIEWER.scene.add(light);

        // camera light
        this.VIEWER.scene.add(new THREE.AmbientLight(0xD8D8D8));

        let flashlight = new THREE.PointLight(0xCFCFCF, 0.8, this.GLOBALS.boundingSphere.radius * 12, 1);

        this.VIEWER.camera.add(flashlight);

        this.VIEWER.scene.add(this.VIEWER.camera);

        // grids
        this.makeContext();

        // resize events
        let SPK = this;
        $(window).resize(function () {
            SPK.VIEWER.renderer.setSize($(SPK.HMTL.canvas).innerWidth() - 1, $(SPK.HMTL.canvas).innerHeight() - 5);
            SPK.VIEWER.camera.aspect = ($(SPK.HMTL.canvas).innerWidth() - 1) / ($(SPK.HMTL.canvas).innerHeight() - 5);
            SPK.VIEWER.camera.updateProjectionMatrix();
        });

        window.scene = this.VIEWER.scene;
    };

    makeContext() {
        let multiplier = 10;

        let planeGeometry = new THREE.PlaneGeometry(this.GLOBALS.boundingSphere.radius * multiplier * 2,
            this.GLOBALS.boundingSphere.radius * multiplier * 2, 2, 2); //three.THREE.PlaneGeometry( width, depth, segmentsWidth, segmentsDepth );
        planeGeometry.rotateX(-Math.PI / 2);
        let planeMaterial = new THREE.MeshBasicMaterial({color: 0xEEEEEE}); //0xEEEEEE #D7D7D7
        plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.receiveShadow = true;
        plane.position.set(this.GLOBALS.boundingSphere.center.x, -0.21, this.GLOBALS.boundingSphere.center.z);
        plane.visible = true;

        this.VIEWER.scene.add(plane);
        this.SCENE.plane = plane;

        if (this.GLOBALS.boundingSphere.radius === 0) {
            console.error("ERR: Failed to calculate bounding sphere. This is a known bug and it happens when " +
                "there's no valid geometry in the scene.");
            //$(".model-name").append(
            $(this.HMTL.sliders).html(
                "<br><p style='color: red'>Failed to load model. " +
                "<strong>Check the console for details (if you feel like a hacker), and send a shout over to " +
                "<a href='mailto:contact@dimitrie.org?subject=Model " + this.GLOBALS.model +
                " failed to load'>contact@dimitrie.org.</a> " +
                "so we can look into it. Thanks!</p>")
        } else {
            grid = new THREE.GridHelper(this.GLOBALS.boundingSphere.radius * multiplier,
                this.GLOBALS.boundingSphere.radius * multiplier / 30);
            grid.material.opacity = 0.15;
            grid.material.transparent = true;
            grid.position.set(this.GLOBALS.boundingSphere.center.x, -0.2, this.GLOBALS.boundingSphere.center.z);
            grid.setColors(0x0000ff, 0x808080);
            this.VIEWER.scene.add(grid);
            this.SCENE.grid = grid;
        }
    };


    /*************************************************
     /   SPK CAMERA FUNC
     *************************************************/
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

    /*************************************************
     /   SPK CAMERA FUNC
     *************************************************/
    zoomExtents() {
        let r = this.GLOBALS.boundingSphere.radius;
        let offset = r / Math.tan(Math.PI / 180.0 * this.VIEWER.controls.object.fov * 0.4);
        let vector = new THREE.Vector3(0, 0, 1);
        let dir = vector.applyQuaternion(this.VIEWER.controls.object.quaternion);
        let newPos = new THREE.Vector3();
        dir.multiplyScalar(offset * 1.05);
        newPos.addVectors(this.GLOBALS.boundingSphere.center, dir);

        let futureLocation = {};
        futureLocation.position = newPos;
        futureLocation.rotation = this.VIEWER.controls.object.rotation.clone();
        futureLocation.controlCenter = this.GLOBALS.boundingSphere.center.clone();
        this.setCameraTween(JSON.stringify(futureLocation));
    };

    static beep() {
        return "boop"; // THE MOST AMAZING FUNCTION 3V3R
    };
};

