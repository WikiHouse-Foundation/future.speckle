/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Dimitrie Andrei Stefanescu & University College London (UCL)
 */
import $ from 'jquery';

import SPKLoader from './SPKLoader.jsx';
import SPKRenderer from './SPKRenderer.jsx';
import SPKMaker from './SPKObjectMaker.js';

export default class SPK {
    constructor(options) {
        this.Options = options;

        this.Options.lockCameraOnInstanceChange = false; //@TODO remove this override

        this.RENDERER = new SPKRenderer(options.renderer);
        this.PARAMS = {};
        this.GLOBALS = {
            model: "",
            metadata: {
                paramsFile: "",
                staticGeoFile: "",
                rootFiles: ""
            },
            sliders: [],
            currentKey: ""
        };
        this.init = this.init.bind(this);
        this.loadMetaData = this.loadMetaData.bind(this);
        this.loadParamsData = this.loadParamsData.bind(this);

        this.addNewInstance = this.addNewInstance.bind(this);

        this.loadParallelInstance = this.loadParallelInstance.bind(this);
        this.loadStaticInstance = this.loadStaticInstance.bind(this);
        this.startRenderer = this.startRenderer.bind(this);
    }

    init(modelId) {
        this.GLOBALS.model = modelId;

        this.RENDERER.init(this.Options.canvasid);

        // load parameters && go!
        let SPK = this;
        this.loadMetaData(() => {
            SPK.loadParamsData(firstKey => {
                SPK.addNewInstance(firstKey, () => {
                    SPK.startRenderer();
                });
            });
        });
    };

    startRenderer() {
        this.loadStaticInstance();

        this.RENDERER.startRendering();

        if (this.Options.onInitEnd !== undefined) {
            this.Options.onInitEnd(this)
        }
    };

    loadMetaData(callback) {
        SPKLoader.get(SPKConfig.GEOMAPI + this.GLOBALS.model, data => {
            data.deflateLocation = data.deflateLocation.replace("./", "/");

            this.GLOBALS.metadata.paramsFile = SPKConfig.APPDIR + data.deflateLocation + "/params.json";
            this.GLOBALS.metadata.staticGeoFile = SPKConfig.APPDIR + data.deflateLocation + "/static.json";
            this.GLOBALS.metadata.rootFiles = SPKConfig.APPDIR + data.deflateLocation + "/";

            if (callback !== undefined) {
                callback();
            }
        });
    };

    loadParamsData(callback) {
        $.getJSON(this.GLOBALS.metadata.paramsFile, data => {
            this.PARAMS = data;

            if (callback) {
                callback(data.kvpairs[0].key);
            }
        });
    };

    addNewInstance(key, callback) {
        if (this.GLOBALS.currentKey === key) {
            return;
        }

        this.GLOBALS.currentKey = key;
        this.RENDERER.purgeScene(this.GLOBALS.currentKey);

        SPKLoader.loadGeometryData(`${this.GLOBALS.metadata.rootFiles}${key}.json`, instanceData => {
            this.RENDERER.onLoadInstance(instanceData, this.GLOBALS.currentKey);

            if (callback != undefined) {
                callback();
            }


            if (this.Options.onInstanceChange !== undefined) {
                this.Options.onInstanceChange(this.PARAMS, key);
            }
        });
    };

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

    loadStaticInstance() {
        SPKLoader.loadGeometryData(this.GLOBALS.metadata.staticGeoFile, instanceData => {
            this.RENDERER.onLoadStaticInstance(instanceData);
        });
    };

    static beep() {
        return "boop"; // THE MOST AMAZING FUNCTION 3V3R
    };
};

