/*
 * The MIT License (MIT)
 * Copyright (c) 2016 Dimitrie Andrei Stefanescu & University College London (UCL)
 */
import $ from 'jquery';
import noUISlider from 'nouislider';
import shortid from 'shortid';


export default class SPKSliderControl {
    constructor(options) {
        this.Options = options;
        this.id = shortid.generate();

        this.SPK = this.Options.spk;
        this.Data = this.Options.data;

        this.Wrapper = {};
        this.Wrapper = $(`#${this.Options.wrapperid}`);
        this.Sliders = [];
        this.MeasureSliders = [];

        this.init = this.init.bind(this);
        this.getCurrentKey = this.getCurrentKey.bind(this);
        this.setMeasureSliders = this.setMeasureSliders.bind(this);
        this.makeMeasureSliders = this.makeMeasureSliders.bind(this);
        this.makeSliders = this.makeSliders.bind(this);
    }

    init() {
        $(this.Wrapper).attr("spktabid", this.id);

        // register 'tab' in ui-tabs
        let uitabs = $(`#${this.Options.uitabid}`);
        let icon = "<div class='icon icon-active' spkuiid='" + this.id + "'>" +
            "<span class='hint--right' data-hint='Paramaters & Performance'><i class='fa " + this.Options.icon + "'></span>" +
            "</div>";
        $(uitabs).append(icon);

        $("[spkuiid='" + this.id + "']").click(function () {
            $("#spk-ui-tabs").find(".icon").removeClass("icon-active");
            $(this).addClass("icon-active");
            $(".sidebar").addClass("sidebar-hidden");
            $("[spktabid='" + this.id + "']").removeClass("sidebar-hidden");
        });

        this.makeSliders(this.Options.data.parameters);

        if (this.Options.showmeasures === true) {
            this.makeMeasureSliders(this.Options.data.properties);
        }
    }

    makeSliders(params) {
        if (this.Options.showmeasures) {
            $(this.Wrapper).append("<h1 class='slider-group-title'>Model Parameters</h1>")
        } else {
            $(this.Wrapper).append("<br>");
        }

        for (let i = 0; i < params.length; i++) {
            let paramId = `parameter_${i}${shortid.generate()}`;
            let paramName = params[i].name === "" ? "Unnamed Parameter" : params[i].name;

            $(this.Wrapper).append($("<div>", {id: paramId, class: "parameter"}));

            $(`#${paramId}`).append(`<p class='parameter_name'>${paramName}</p>`);

            let sliderId = `${paramId}_slider_${i}_`;

            $(`#${paramId}`).append($("<div>", {id: sliderId, class: "basic-slider"}));

            let myRange = {}, norm = 100 / (params[i].values.length - 1);

            for (let j = 0; j < params[i].values.length; j++) {
                myRange[norm * j + "%"] = params[i].values[j];
            }

            myRange["min"] = myRange["0%"];
            delete myRange["0%"];

            myRange["max"] = myRange["100%"];
            delete  myRange["100%"];

            let slider = noUISlider.create($(`#${sliderId}`)[0], {
                start: [0],
                conect: false,
                tooltips: true,
                snap: true,
                range: myRange,
                pips: {
                    mode: "values",
                    values: params[i].values,
                    density: 3
                }
            });
            this.Sliders.push(slider);
        }

        let SPKSliderControl = this;
        for (let i = 0; i < this.Sliders.length; i++) {
            this.Sliders[i].on("change", function () {
                let currentKey = SPKSliderControl.getCurrentKey();
                SPKSliderControl.SPK.addNewInstance(currentKey, function () {
                    if (!(SPKSliderControl.SPK.Options.zoomonchange === false ))
                        if (SPKSliderControl.SPK.Options.lockCameraOnInstanceChange === false) {
                            SPKSliderControl.SPK.RENDERER.zoomExtents();
                        }
                });
                SPKSliderControl.setMeasureSliders(currentKey);
                //this.SPK.RENDERER.zoomExtents()
            });
        }
    }

    makeMeasureSliders(params) {
        if (params === undefined || params.length == 0) {
            return;
        }

        $(this.Wrapper).append("<br><br><h1 class='slider-group-title'>Performance Measures</h1>");

        for (let i = 0; i < params.length; i++) {
            let param = params[i];

            let myRange = param.values;
            myRange.sort(function (a, b) {
                return a - b
            });

            let sliderRange = {
                "min": Number(myRange[0]),
                "max": Number(myRange[myRange.length - 1])
            };

            let wrpName = "measure-wrapper-" + i + "_" + shortid.generate();
            let container = $(this.Wrapper);

            let myMeasureWrapper = $(container).append($("<div>", {id: wrpName, class: "measure parameter"}));
            let finalName = "<p>" + param.name + "</p><p> <span class='pull-left'>(MIN) " + myRange[0] + "</span> "
                + " <span class='pull-right'>" + myRange[myRange.length - 1] + " (MAX)</span></p>";
            $(`#${wrpName}`).append($("<p>", {
                class: "measure-name parameter_name text-center",
                html: finalName
            }));
            let sliderId = "measure-" + i + "_" + shortid.generate();
            $(`#${wrpName}`).append($("<div>", {id: sliderId, class: "basic-slider measure-slider"}));

            let slider = noUISlider.create($(`#${sliderId}`)[0], {
                start: [0],
                conect: true,
                tooltips: true,
                snap: false,
                range: sliderRange,
                disable: true
            });

            $(`#${sliderId}`)[0].setAttribute('disabled', true);

            this.MeasureSliders.push(slider);
        }
    }

    setMeasureSliders(key) {
        let mymeasures = "";
        let found = false;
        for (let i = 0; i < this.Data.kvpairs.length && !found; i++) {
            if (this.Data.kvpairs[i].key === key) {
                mymeasures = this.Data.kvpairs[i].values;
                found = true;
            }
        }

        let mysplits = mymeasures.split(",");

        for (let i = 0; i < this.MeasureSliders.length; i++) {
            this.MeasureSliders[i].set(Number(mysplits[i]));
        }
    }

    getCurrentKey() {
        let key = "";
        for (let i = 0; i < this.Sliders.length; i++) {
            key += Number(this.Sliders[i].get()).toString() + ",";
        }
        return key;
    }
}
