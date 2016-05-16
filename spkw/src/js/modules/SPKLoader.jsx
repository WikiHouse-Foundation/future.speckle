/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Dimitrie Andrei Stefanescu & University College London (UCL)
 */
import THREE from 'three';


/*
 Handles all json loading and parsing
 */
export default class SPKLoader {
    constructor(options) {

    }

    static get(url, onLoadAction) {
        init = {};
        init.method = 'GET';
        init.mode = 'cors';
        init.cache = 'default';
        init.headers = {};

        fetch(url, init).then(response => {
                    response.json().then(response => {
                        onLoadAction(response);
                    });
                });
    }

    static loadGeometryData(url, onLoadAction) {
        let loader = new THREE.XHRLoader();
        loader.load(
            url,
            function (body) {
                SPKLoader.parse(JSON.parse(body), onLoadAction);
            },
            SPKLoader.onProgress,
            SPKLoader.onError
        );
    };

    static onProgress() {
        // TODO
    };

    static onError() {
        // TODO
    };

    static parse(json, onLoadAction) {
        let collatedReturn = {};
        collatedReturn.geometries = SPKLoader.parseGeometries(json.geometries);
        collatedReturn.properties = json.metadata.properties;

        onLoadAction(collatedReturn);
    };

    static parseGeometries(json, instanceName) {
        let geometries = [];

        if (json != undefined) {
            let geometryLoader = new THREE.JSONLoader();

            for (let i = 0; i < json.length; i++) {
                let geometry = {};
                let data = json[i];

                switch (data.type) {
                    case 'TextGeometry' :
                        //TODO
                        break;

                    case  'SPKL_Polyline' :
                        geometry = geometryLoader.parse(data.data).geometry;
                        geometry.isClosed = data.data.isClosed;
                        break;

                    case 'SPKL_Mesh' :
                        geometry = geometryLoader.parse(data.data).geometry;
                        break;

                    case 'SPKL_ColorMesh' :
                        geometry = geometryLoader.parse(data.data).geometry;
                        geometry.vertexColors = data.data.vertexColors;
                        break;

                    case 'SPKL_Point' :
                        geometry = geometryLoader.parse(data.data).geometry;
                        break;

                    case 'SPKL_Options' :
                        console.warn("Found some SPKL Options. Ignoring.");
                        break;

                    default :
                        //console.warn("Unsuported data type detected!");
                        //console.log(data);
                        break;
                }

                geometry.SPKLType = data.type;
                geometry.instanceName = instanceName;

                geometry.uuid = data.uuid;

                if (data.name !== undefined) {
                    geometry.name = data.name;
                }

                geometries.push(geometry);
            }
        }

        return geometries;
    };

};
