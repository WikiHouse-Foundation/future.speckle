var $ = require('jquery');
var SPK = require('./modules/SPK.jsx').default;
var SPKMeta = require('./modules/SPKMetaDisplay.js');
var SPKSliderControl = require('./modules/SPKSliderControl.jsx').default;
var SPKCommentsControl = require('./modules/SPKCommentsControl.js');
var SPKHelpControl = require('./modules/SPKHelpControl.js');
var SPKKeyHandler = require('./modules/SPKKeyHandler.js');

$(function () {
    var mySPK = new SPK({
        canvasid: 'spk-canvas',
        onInitEnd: function (SPK) {

            var myMeta = new SPKMeta({
                wrapperid: 'spk-metadata',
                spk: SPK
            });

            var mySliderCtrl = new SPKSliderControl({
                wrapperid: 'spk-parameters',
                uitabid: 'spk-ui-tabs',
                icon: 'fa-sliders',
                data: SPK.PARAMS,
                open: false,
                showmeasures: true,
                spk: SPK
            });
            mySliderCtrl.init();

            var myCommentCtrl = new SPKCommentsControl({
                wrapperid: 'spk-comments',
                formid: 'instance-saver-form',
                uitabid: 'spk-ui-tabs',
                icon: 'fa-comments',
                data: SPK.PARAMS,
                open: false,
                spk: SPK
            });

            var myHelpCtrl = new SPKHelpControl({
                wrapperid: 'spk-help',
                uitabid: 'spk-ui-tabs',
                icon: 'fa-info-circle'
                //icon : 'fa-cogs'
            });

            var myKeyHandler = new SPKKeyHandler({
                spk: SPK
            });
            //window.SPK = mySPK;
        }
    });

    var locationPath = window.location.pathname;
    var modelId = locationPath.substr(locationPath.lastIndexOf('/') + 1);
    mySPK.init(modelId);
});
